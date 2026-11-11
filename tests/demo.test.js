import assert from "node:assert/strict";
import { test } from "node:test";
import { demoConfirmations, hashString, seededRandom } from "../src/lib/demo.js";
import { BOARDING_POINTS } from "../src/lib/schedule.js";

test("hashString is stable and spreads values", () => {
  assert.equal(hashString("abc"), hashString("abc"));
  assert.notEqual(hashString("abc"), hashString("abd"));
  assert.equal(hashString(""), 0x811c9dc5);
});

test("seededRandom repeats for the same seed and stays in [0, 1)", () => {
  const a = seededRandom(7);
  const b = seededRandom(7);
  for (let i = 0; i < 1000; i++) {
    const value = a();
    assert.equal(value, b());
    assert.ok(value >= 0 && value < 1);
  }
});

test("demo numbers are the same for the same trip", () => {
  assert.deepEqual(demoConfirmations("2026-11-10:noite"), demoConfirmations("2026-11-10:noite"));
});

test("demo numbers stay in the range of each shift", () => {
  const ranges = { manha: [30, 70], tarde: [15, 45], noite: [45, 95] };
  for (let day = 1; day <= 28; day++) {
    for (const [shift, [low, high]] of Object.entries(ranges)) {
      const { total } = demoConfirmations(`2026-02-${String(day).padStart(2, "0")}:${shift}`);
      assert.ok(total >= low && total <= high, `${shift} ${day}: ${total}`);
    }
  }
});

test("demo boarding points add up to the total", () => {
  for (let day = 1; day <= 28; day++) {
    const { total, byPoint } = demoConfirmations(`2026-03-${String(day).padStart(2, "0")}:manha`);
    assert.deepEqual(Object.keys(byPoint), BOARDING_POINTS);
    assert.equal(Object.values(byPoint).reduce((a, b) => a + b, 0), total);
    assert.ok(Object.values(byPoint).every((n) => n >= 0));
  }
});

test("an invalid trip key has no demo students", () => {
  assert.deepEqual(demoConfirmations("nope"), { total: 0, byPoint: {} });
});
