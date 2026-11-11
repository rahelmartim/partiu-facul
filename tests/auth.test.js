import assert from "node:assert/strict";
import { test } from "node:test";
import { LOCK_MS, MAX_FAILED_LOGINS, publicUser } from "../src/lib/auth.js";
import { authWith, clock, student } from "./helpers.js";

test("register creates a user without the password in the result", async () => {
  const { auth } = authWith();
  const result = await auth.register(student());
  assert.equal(result.ok, true);
  assert.equal(result.user.email, "ana@example.com");
  assert.equal(result.user.studentId, "ABC1234");
  assert.equal(result.user.password, undefined);
});

test("register stores a hash, never the password", async () => {
  const { auth, store } = authWith();
  await auth.register(student());
  const saved = JSON.stringify(store.get("users"));
  assert.ok(!saved.includes("segredo123"));
  assert.match(saved, /"hash":"[0-9a-f]{64}"/);
});

test("register returns field errors for invalid data", async () => {
  const { auth, store } = authWith();
  const result = await auth.register(student({ email: "nope", password: "1" }));
  assert.equal(result.ok, false);
  assert.ok(result.errors.email && result.errors.password);
  assert.deepEqual(store.get("users", {}), {});
});

test("register rejects a repeated e-mail or student ID, whatever the case", async () => {
  const { auth } = authWith();
  await auth.register(student());
  const sameEmail = await auth.register(student({ studentId: "OTHER99", email: "ANA@example.com" }));
  assert.match(sameEmail.errors.email, /já está cadastrado/);
  const sameId = await auth.register(student({ email: "outra@example.com", studentId: "ABC1234" }));
  assert.match(sameId.errors.studentId, /já está cadastrado/);
});

test("login works with the e-mail or the student ID", async () => {
  const { auth } = authWith();
  await auth.register(student());
  assert.equal((await auth.login("ana@example.com", "segredo123")).ok, true);
  assert.equal((await auth.login(" ABC1234 ", "segredo123")).ok, true);
  assert.equal((await auth.login("abc1234", "segredo123")).ok, true);
});

test("login fails with the same message for a wrong password or an unknown user", async () => {
  const { auth } = authWith();
  await auth.register(student());
  const wrong = await auth.login("ana@example.com", "errada");
  const unknown = await auth.login("ninguem@example.com", "segredo123");
  assert.equal(wrong.ok, false);
  assert.equal(wrong.error, unknown.error);
});

test("keep me logged in stores the session in the persistent store", async () => {
  const { auth, store, temporary } = authWith();
  await auth.register(student());
  await auth.login("ana@example.com", "segredo123", { remember: true });
  assert.ok(store.get("session"));
  assert.equal(temporary.get("session"), null);
  assert.equal(auth.currentUser().firstName, "Ana");
});

test("without keep me logged in the session is temporary", async () => {
  const { auth, store, temporary } = authWith();
  await auth.register(student());
  await auth.login("ana@example.com", "segredo123");
  assert.equal(store.get("session"), null);
  assert.ok(temporary.get("session"));
});

test("currentUser is null before login and after logout", async () => {
  const { auth } = authWith();
  assert.equal(auth.currentUser(), null);
  await auth.register(student());
  await auth.login("ana@example.com", "segredo123", { remember: true });
  auth.logout();
  assert.equal(auth.currentUser(), null);
});

test("logout removes the session from the session list", async () => {
  const { auth, store } = authWith();
  await auth.register(student());
  await auth.login("ana@example.com", "segredo123");
  auth.logout();
  assert.deepEqual(store.get("sessions"), {});
});

test("an unknown session token gives no user", async () => {
  const { auth, temporary } = authWith();
  temporary.set("session", "forged-token");
  assert.equal(auth.currentUser(), null);
});

test("too many failed logins lock the login for a while", async () => {
  const now = clock();
  const { auth } = authWith({ now });
  await auth.register(student());
  for (let i = 0; i < MAX_FAILED_LOGINS; i++) await auth.login("ana@example.com", "errada");
  const locked = await auth.login("ana@example.com", "segredo123");
  assert.equal(locked.ok, false);
  assert.match(locked.error, /Muitas tentativas/);
  now.advance(LOCK_MS + 1);
  assert.equal((await auth.login("ana@example.com", "segredo123")).ok, true);
});

test("a successful login resets the failure count", async () => {
  const { auth } = authWith();
  await auth.register(student());
  for (let i = 0; i < MAX_FAILED_LOGINS - 1; i++) await auth.login("ana@example.com", "errada");
  await auth.login("ana@example.com", "segredo123");
  for (let i = 0; i < MAX_FAILED_LOGINS - 1; i++) await auth.login("ana@example.com", "errada");
  assert.equal((await auth.login("ana@example.com", "segredo123")).ok, true);
});

test("updateProfile changes the data and keeps the password", async () => {
  const { auth } = authWith();
  const { user } = await auth.register(student());
  const result = await auth.updateProfile(user.id, student({ firstName: "Ana Maria", password: "" }));
  assert.equal(result.ok, true);
  assert.equal(result.user.firstName, "Ana Maria");
  assert.equal((await auth.login("ana@example.com", "segredo123")).ok, true);
});

test("updateProfile can change the password", async () => {
  const { auth } = authWith();
  const { user } = await auth.register(student());
  await auth.updateProfile(user.id, student({ password: "novasenha" }));
  assert.equal((await auth.login("ana@example.com", "segredo123")).ok, false);
  assert.equal((await auth.login("ana@example.com", "novasenha")).ok, true);
});

test("updateProfile allows the own e-mail, but not the e-mail of another student", async () => {
  const { auth } = authWith();
  const { user } = await auth.register(student());
  await auth.register(student({ email: "bia@example.com", studentId: "BIA0001" }));
  assert.equal((await auth.updateProfile(user.id, student())).ok, true);
  const taken = await auth.updateProfile(user.id, student({ email: "bia@example.com" }));
  assert.match(taken.errors.email, /já está cadastrado/);
});

test("updateProfile of an unknown user fails", async () => {
  const { auth } = authWith();
  assert.equal((await auth.updateProfile("nobody", student())).ok, false);
});

test("deleteAccount removes the user and logs out", async () => {
  const { auth, store } = authWith();
  const { user } = await auth.register(student());
  await auth.login("ana@example.com", "segredo123", { remember: true });
  auth.deleteAccount(user.id);
  assert.deepEqual(store.get("users"), {});
  assert.equal(auth.currentUser(), null);
  assert.equal((await auth.login("ana@example.com", "segredo123")).ok, false);
});

test("publicUser removes the password", () => {
  assert.deepEqual(publicUser({ id: "1", password: { hash: "x" } }), { id: "1" });
  assert.equal(publicUser(null), null);
});
