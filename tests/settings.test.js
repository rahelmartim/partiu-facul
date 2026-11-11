import assert from "node:assert/strict";
import { test } from "node:test";
import { createSettings, DEFAULT_SETTINGS } from "../src/lib/settings.js";
import { createStore } from "../src/lib/storage.js";

test("settings start with the defaults", () => {
  assert.deepEqual(createSettings(createStore()).get("ana"), DEFAULT_SETTINGS);
});

test("set changes only known boolean settings", () => {
  const settings = createSettings(createStore());
  const next = settings.set("ana", { autoConfirm: true, demoClassmates: "no", hacker: true });
  assert.deepEqual(next, { autoConfirm: true, demoClassmates: true });
  assert.deepEqual(settings.get("ana"), next);
});

test("settings are per student", () => {
  const settings = createSettings(createStore());
  settings.set("ana", { demoClassmates: false });
  assert.equal(settings.get("bia").demoClassmates, true);
});

test("broken saved settings fall back to the defaults", () => {
  const store = createStore();
  store.set("settings", { ana: { autoConfirm: "yes" } });
  assert.deepEqual(createSettings(store).get("ana"), DEFAULT_SETTINGS);
});

test("remove deletes the settings of a student", () => {
  const settings = createSettings(createStore());
  settings.set("ana", { autoConfirm: true });
  settings.remove("ana");
  assert.deepEqual(settings.get("ana"), DEFAULT_SETTINGS);
});
