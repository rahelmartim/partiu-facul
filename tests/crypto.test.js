import assert from "node:assert/strict";
import { test } from "node:test";
import { hashPassword, randomHex, verifyPassword } from "../src/lib/crypto.js";

test("randomHex has the requested length and changes", () => {
  assert.match(randomHex(8), /^[0-9a-f]{16}$/);
  assert.notEqual(randomHex(), randomHex());
});

test("the same password and salt give the same hash", async () => {
  const a = await hashPassword("segredo", "00112233445566778899aabbccddeeff", 1000);
  const b = await hashPassword("segredo", "00112233445566778899aabbccddeeff", 1000);
  assert.equal(a.hash, b.hash);
  assert.match(a.hash, /^[0-9a-f]{64}$/);
});

test("a new salt gives a new hash", async () => {
  const a = await hashPassword("segredo");
  const b = await hashPassword("segredo");
  assert.notEqual(a.salt, b.salt);
  assert.notEqual(a.hash, b.hash);
});

test("the hash does not contain the password", async () => {
  const stored = await hashPassword("minhasenha");
  assert.ok(!JSON.stringify(stored).includes("minhasenha"));
});

test("verifyPassword accepts the right password only", async () => {
  const stored = await hashPassword("segredo123");
  assert.equal(await verifyPassword("segredo123", stored), true);
  assert.equal(await verifyPassword("Segredo123", stored), false);
  assert.equal(await verifyPassword("", stored), false);
});

test("verifyPassword rejects missing or broken data", async () => {
  assert.equal(await verifyPassword("x", null), false);
  assert.equal(await verifyPassword("x", { salt: "00" }), false);
  assert.equal(await verifyPassword("x", { salt: "00", hash: "abc" }), false);
});

test("unicode passwords work", async () => {
  const stored = await hashPassword("ônibus-çã-🚌");
  assert.equal(await verifyPassword("ônibus-çã-🚌", stored), true);
  assert.equal(await verifyPassword("onibus-ca-🚌", stored), false);
});
