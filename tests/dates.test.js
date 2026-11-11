import assert from "node:assert/strict";
import { test } from "node:test";
import { addDays, dateKey, dayByKey, dayOf, departureOf, DAYS, formatShortDate, parseDateKey, shiftByKey, SHIFTS } from "../src/lib/dates.js";

test("dateKey pads month and day", () => {
  assert.equal(dateKey(new Date(2026, 0, 5)), "2026-01-05");
  assert.equal(dateKey(new Date(2026, 11, 31, 23, 59)), "2026-12-31");
});

test("parseDateKey reads valid dates and rejects others", () => {
  assert.equal(dateKey(parseDateKey("2026-11-10")), "2026-11-10");
  for (const bad of ["", "2026-13-01", "2026-02-30", "10/11/2026", "2026-1-1", null]) {
    assert.equal(parseDateKey(bad), null, String(bad));
  }
});

test("dateKey and parseDateKey are inverse for a whole year", () => {
  for (let i = 0; i < 366; i++) {
    const date = addDays(new Date(2028, 0, 1), i);
    assert.equal(dateKey(parseDateKey(dateKey(date))), dateKey(date));
  }
});

test("dayOf maps Monday to Friday, and weekends to null", () => {
  // 2026-11-09 is a Monday.
  const keys = [0, 1, 2, 3, 4, 5, 6].map((i) => dayOf(addDays(new Date(2026, 10, 9), i))?.key ?? null);
  assert.deepEqual(keys, ["seg", "ter", "qua", "qui", "sex", null, null]);
});

test("departureOf uses the shift time on the same day", () => {
  const date = new Date(2026, 10, 10, 15, 45);
  assert.equal(departureOf(date, "manha").getHours(), 6);
  assert.equal(departureOf(date, "manha").getMinutes(), 30);
  assert.equal(departureOf(date, "noite").getHours(), 17);
  assert.equal(dateKey(departureOf(date, "tarde")), "2026-11-10");
  assert.throws(() => departureOf(date, "madrugada"));
});

test("shifts are in time order", () => {
  const times = SHIFTS.map((s) => s.departure);
  assert.deepEqual([...times].sort(), times);
});

test("lookups by key", () => {
  assert.equal(shiftByKey("tarde").label, "Tarde");
  assert.equal(dayByKey("qua").name, "Quarta-feira");
  assert.equal(shiftByKey("x"), null);
  assert.equal(dayByKey("sab"), null);
  assert.equal(DAYS.length, 5);
});

test("addDays crosses months and years", () => {
  assert.equal(dateKey(addDays(new Date(2026, 11, 30), 3)), "2027-01-02");
  assert.equal(dateKey(addDays(new Date(2028, 1, 28), 1)), "2028-02-29");
});

test("formatShortDate uses Portuguese weekdays", () => {
  assert.equal(formatShortDate(new Date(2026, 10, 10)), "ter, 10/11");
  assert.equal(formatShortDate(new Date(2026, 10, 15)), "dom, 15/11");
});
