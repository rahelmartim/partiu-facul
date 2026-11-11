import assert from "node:assert/strict";
import { test } from "node:test";
import { demoConfirmations } from "../src/lib/demo.js";
import { BOARDING_POINTS } from "../src/lib/schedule.js";
import { createStore } from "../src/lib/storage.js";
import { autoConfirm, BUS_CAPACITY, busesNeeded, createTripService } from "../src/lib/trips.js";

const KEY = "2026-11-10:noite";
const before = new Date(2026, 10, 10, 12, 0);
const after = new Date(2026, 10, 10, 17, 30);
const POINT = BOARDING_POINTS[1];

test("busesNeeded rounds up to whole buses", () => {
  assert.equal(busesNeeded(0), 0);
  assert.equal(busesNeeded(1), 1);
  assert.equal(busesNeeded(BUS_CAPACITY), 1);
  assert.equal(busesNeeded(BUS_CAPACITY + 1), 2);
  assert.equal(busesNeeded(100, 50), 2);
  assert.equal(busesNeeded(-3), 0);
  assert.throws(() => busesNeeded(10, 0));
  assert.throws(() => busesNeeded(10, 2.5));
});

test("confirm and cancel a trip", () => {
  const trips = createTripService(createStore());
  assert.equal(trips.confirm("ana", KEY, POINT, before).ok, true);
  assert.equal(trips.isConfirmed("ana", KEY), true);
  assert.equal(trips.cancel("ana", KEY, before).ok, true);
  assert.equal(trips.isConfirmed("ana", KEY), false);
});

test("confirming twice counts once", () => {
  const trips = createTripService(createStore());
  trips.confirm("ana", KEY, POINT, before);
  trips.confirm("ana", KEY, POINT, before);
  assert.equal(trips.summary(KEY, { includeDemo: false }).confirmations, 1);
});

test("nobody can confirm or cancel after the bus left", () => {
  const trips = createTripService(createStore());
  assert.match(trips.confirm("ana", KEY, POINT, after).error, /já saiu/);
  trips.confirm("bia", KEY, POINT, before);
  assert.match(trips.cancel("bia", KEY, after).error, /já saiu/);
  assert.equal(trips.isConfirmed("bia", KEY), true);
});

test("confirm checks the trip and the boarding point", () => {
  const trips = createTripService(createStore());
  assert.equal(trips.confirm("ana", "2026-11-10:madrugada", POINT, before).ok, false);
  assert.equal(trips.confirm("ana", "2026-02-30:manha", POINT, before).ok, false);
  assert.equal(trips.confirm("ana", KEY, "Marte", before).ok, false);
});

test("summary counts real students per boarding point", () => {
  const trips = createTripService(createStore());
  trips.confirm("ana", KEY, BOARDING_POINTS[0], before);
  trips.confirm("bia", KEY, BOARDING_POINTS[0], before);
  trips.confirm("caio", KEY, BOARDING_POINTS[2], before);
  const s = trips.summary(KEY, { includeDemo: false });
  assert.equal(s.confirmations, 3);
  assert.equal(s.buses, 1);
  assert.equal(s.seatsLeft, BUS_CAPACITY - 3);
  assert.equal(s.byPoint[BOARDING_POINTS[0]], 2);
  assert.equal(s.byPoint[BOARDING_POINTS[2]], 1);
  assert.equal(s.byPoint[BOARDING_POINTS[1]], 0);
});

test("summary adds the demo students when asked", () => {
  const trips = createTripService(createStore());
  trips.confirm("ana", KEY, POINT, before);
  const demo = demoConfirmations(KEY).total;
  const s = trips.summary(KEY);
  assert.equal(s.confirmations, demo + 1);
  assert.equal(s.buses, Math.ceil((demo + 1) / BUS_CAPACITY));
});

test("a smaller bus needs more trips", () => {
  const trips = createTripService(createStore(), { capacity: 2 });
  for (const id of ["a", "b", "c", "d", "e"]) trips.confirm(id, KEY, POINT, before);
  assert.equal(trips.summary(KEY, { includeDemo: false }).buses, 3);
});

test("trips are independent", () => {
  const trips = createTripService(createStore());
  trips.confirm("ana", KEY, POINT, before);
  assert.equal(trips.isConfirmed("ana", "2026-11-11:noite"), false);
  assert.equal(trips.summary("2026-11-11:noite", { includeDemo: false }).confirmations, 0);
});

test("history lists the confirmed trips in order", () => {
  const trips = createTripService(createStore());
  const early = new Date(2026, 10, 1);
  trips.confirm("ana", "2026-11-12:manha", POINT, early);
  trips.confirm("ana", "2026-11-10:noite", POINT, early);
  trips.confirm("bia", "2026-11-11:tarde", POINT, early);
  assert.deepEqual(trips.history("ana"), ["2026-11-10:noite", "2026-11-12:manha"]);
});

test("removeUser deletes every confirmation of a student", () => {
  const trips = createTripService(createStore());
  const early = new Date(2026, 10, 1);
  trips.confirm("ana", "2026-11-10:noite", POINT, early);
  trips.confirm("ana", "2026-11-11:noite", POINT, early);
  trips.confirm("bia", "2026-11-10:noite", POINT, early);
  trips.removeUser("ana");
  assert.deepEqual(trips.history("ana"), []);
  assert.equal(trips.isConfirmed("bia", "2026-11-10:noite"), true);
});

test("autoConfirm confirms the next trip once", () => {
  const trips = createTripService(createStore());
  const trip = { key: KEY };
  assert.equal(autoConfirm(trips, "ana", trip, POINT, before), true);
  assert.equal(autoConfirm(trips, "ana", trip, POINT, before), false);
  assert.equal(trips.isConfirmed("ana", KEY), true);
});

test("autoConfirm respects a manual cancel", () => {
  const trips = createTripService(createStore());
  const trip = { key: KEY };
  autoConfirm(trips, "ana", trip, POINT, before);
  trips.cancel("ana", KEY, before);
  assert.equal(autoConfirm(trips, "ana", trip, POINT, before), false);
  assert.equal(trips.isConfirmed("ana", KEY), false);
  // Confirming by hand again clears the cancel.
  trips.confirm("ana", KEY, POINT, before);
  assert.equal(trips.wasDeclined("ana", KEY), false);
});

test("autoConfirm does nothing without a trip", () => {
  assert.equal(autoConfirm(createTripService(createStore()), "ana", null, POINT, before), false);
});
