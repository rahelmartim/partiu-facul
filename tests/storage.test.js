import assert from "node:assert/strict";
import { test } from "node:test";
import { createStore, memoryStorage } from "../src/lib/storage.js";

test("get returns the fallback for a missing key", () => {
  assert.deepEqual(createStore().get("x", { a: 1 }), { a: 1 });
  assert.equal(createStore().get("x"), null);
});

test("set and get keep JSON values", () => {
  const store = createStore();
  store.set("user", { name: "Ana", list: [1, 2], ok: true });
  assert.deepEqual(store.get("user"), { name: "Ana", list: [1, 2], ok: true });
});

test("keys have the app prefix", () => {
  const backend = memoryStorage();
  createStore(backend).set("a", 1);
  assert.equal(backend.getItem("partiufacul:a"), "1");
});

test("broken JSON gives the fallback instead of an error", () => {
  const backend = memoryStorage();
  backend.setItem("partiufacul:a", "{oops");
  assert.equal(createStore(backend).get("a", "fallback"), "fallback");
});

test("update applies a function and saves", () => {
  const store = createStore();
  store.update("count", 0, (n) => n + 1);
  assert.equal(store.update("count", 0, (n) => n + 1), 2);
  assert.equal(store.get("count"), 2);
});

test("remove deletes one key", () => {
  const store = createStore();
  store.set("a", 1);
  store.set("b", 2);
  store.remove("a");
  assert.equal(store.get("a"), null);
  assert.equal(store.get("b"), 2);
});

test("clear removes only the keys of the app", () => {
  const backend = memoryStorage();
  backend.setItem("other-app", "keep");
  const store = createStore(backend);
  store.set("a", 1);
  store.set("b", 2);
  store.clear();
  assert.equal(backend.length, 1);
  assert.equal(backend.getItem("other-app"), "keep");
});

test("memoryStorage follows the Web Storage interface", () => {
  const s = memoryStorage();
  s.setItem("k", 5);
  assert.equal(s.getItem("k"), "5");
  assert.equal(s.key(0), "k");
  assert.equal(s.key(1), null);
  s.clear();
  assert.equal(s.length, 0);
});
