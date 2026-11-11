import assert from "node:assert/strict";
import { test } from "node:test";
import { createStore } from "../src/lib/storage.js";
import { BOARDING_POINTS, countSlots, createScheduleService, emptyGrid, nextTrip, normalizeSchedule, parseTripKey, tripKey, validateSchedule } from "../src/lib/schedule.js";

const schedule = (slots, boardingPoint = BOARDING_POINTS[0]) => {
  const grid = emptyGrid();
  for (const slot of slots) {
    const [day, shift] = slot.split(".");
    grid[day][shift] = true;
  }
  return { grid, boardingPoint };
};

// 2026-11-10 is a Tuesday.
const tuesday = (h, m = 0) => new Date(2026, 10, 10, h, m);

test("emptyGrid has 5 days and 3 shifts, all off", () => {
  const grid = emptyGrid();
  assert.deepEqual(Object.keys(grid), ["seg", "ter", "qua", "qui", "sex"]);
  assert.equal(countSlots(grid), 0);
  assert.deepEqual(Object.keys(grid.seg), ["manha", "tarde", "noite"]);
});

test("normalizeSchedule drops unknown days, shifts, values, and points", () => {
  const s = normalizeSchedule({ grid: { seg: { manha: true, madrugada: true }, sab: { manha: true }, ter: { noite: "yes" } }, boardingPoint: "Lua" });
  assert.equal(countSlots(s.grid), 1);
  assert.equal(s.grid.seg.manha, true);
  assert.equal(s.grid.ter.noite, false);
  assert.equal(s.boardingPoint, "");
  assert.equal(countSlots(normalizeSchedule().grid), 0);
});

test("validateSchedule needs a shift and a boarding point", () => {
  assert.deepEqual(validateSchedule(schedule(["seg.manha"])), {});
  assert.ok(validateSchedule(schedule([])).grid);
  assert.ok(validateSchedule(schedule(["seg.manha"], "")).boardingPoint);
});

test("trip keys", () => {
  assert.equal(tripKey(new Date(2026, 10, 10), "noite"), "2026-11-10:noite");
  assert.deepEqual(parseTripKey("2026-11-10:noite"), { date: "2026-11-10", shift: "noite" });
  for (const bad of ["2026-11-10", "2026-11-10:madrugada", "x:noite", ""]) assert.equal(parseTripKey(bad), null, bad);
});

test("nextTrip finds a later shift on the same day", () => {
  const trip = nextTrip(schedule(["ter.manha", "ter.noite"]), tuesday(8));
  assert.equal(trip.key, "2026-11-10:noite");
  assert.equal(trip.day.key, "ter");
  assert.equal(trip.shift.key, "noite");
});

test("nextTrip skips a bus that already left", () => {
  assert.equal(nextTrip(schedule(["ter.noite", "qua.manha"]), tuesday(17, 30)).key, "2026-11-11:manha");
  assert.equal(nextTrip(schedule(["ter.noite"]), tuesday(17, 29)).key, "2026-11-10:noite");
});

test("nextTrip skips the weekend", () => {
  // Friday night after the bus, with only Monday morning in the schedule.
  const friday = new Date(2026, 10, 13, 20);
  assert.equal(nextTrip(schedule(["seg.manha"]), friday).key, "2026-11-16:manha");
});

test("nextTrip waits a whole week for the same weekday", () => {
  assert.equal(nextTrip(schedule(["ter.manha"]), tuesday(9)).key, "2026-11-17:manha");
});

test("nextTrip is null without shifts", () => {
  assert.equal(nextTrip(schedule([]), tuesday(9)), null);
  assert.equal(nextTrip(undefined, tuesday(9)), null);
});

test("the schedule service saves and reads schedules per student", () => {
  const service = createScheduleService(createStore());
  assert.equal(service.get("ana"), null);
  assert.equal(service.save("ana", schedule(["seg.manha", "qua.noite"])).ok, true);
  assert.equal(countSlots(service.get("ana").grid), 2);
  assert.equal(service.get("bia"), null);
});

test("the schedule service rejects invalid schedules", () => {
  const service = createScheduleService(createStore());
  const result = service.save("ana", schedule([], ""));
  assert.equal(result.ok, false);
  assert.ok(result.errors.grid && result.errors.boardingPoint);
  assert.equal(service.get("ana"), null);
});

test("the schedule service removes a schedule", () => {
  const service = createScheduleService(createStore());
  service.save("ana", schedule(["seg.manha"]));
  service.remove("ana");
  assert.equal(service.get("ana"), null);
});
