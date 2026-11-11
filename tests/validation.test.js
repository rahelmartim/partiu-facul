import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeProfile, validateEmail, validateName, validatePassword, validateProfile, validateStudentId } from "../src/lib/validation.js";
import { student } from "./helpers.js";

test("names accept letters, accents, spaces, apostrophes, and hyphens", () => {
  for (const name of ["Ana", "José", "Maria Clara", "D'Ávila", "Ana-Lu", "Ñandú"]) assert.equal(validateName(name), null, name);
});

test("names reject empty, digits, symbols, and long values", () => {
  assert.match(validateName(""), /obrigatório/);
  assert.match(validateName("   "), /obrigatório/);
  assert.match(validateName("Ana1"), /letras/);
  assert.match(validateName("<script>"), /letras/);
  assert.match(validateName("a".repeat(61)), /no máximo/);
  assert.match(validateName("", "Sobrenome"), /^Sobrenome/);
});

test("e-mails", () => {
  for (const ok of ["a@b.co", "ana.souza+bus@ufc.br"]) assert.equal(validateEmail(ok), null, ok);
  for (const bad of ["", "ana", "ana@", "@ufc.br", "ana@ufc", "a b@ufc.br"]) assert.ok(validateEmail(bad), bad);
  assert.ok(validateEmail(`${"a".repeat(120)}@ufc.br`));
});

test("student IDs have 4 to 20 letters or numbers", () => {
  for (const ok of ["1234", "abc1234", "A".repeat(20)]) assert.equal(validateStudentId(ok), null, ok);
  for (const bad of ["", "123", "12 34", "12-34", "A".repeat(21)]) assert.ok(validateStudentId(bad), bad);
});

test("passwords have 6 to 128 characters", () => {
  assert.equal(validatePassword("123456"), null);
  assert.ok(validatePassword("12345"));
  assert.ok(validatePassword(undefined));
  assert.ok(validatePassword("x".repeat(129)));
});

test("validateProfile returns one message per invalid field", () => {
  assert.deepEqual(validateProfile(student()), {});
  const errors = validateProfile({ firstName: "", lastName: "S", studentId: "1", email: "x", password: "1" });
  assert.deepEqual(Object.keys(errors).sort(), ["email", "firstName", "password", "studentId"]);
});

test("validateProfile can skip the password", () => {
  assert.deepEqual(validateProfile(student({ password: "" }), { requirePassword: false }), {});
  assert.ok(validateProfile(student({ password: "123" }), { requirePassword: false }).password);
});

test("normalizeProfile trims, lower-cases the e-mail, and upper-cases the ID", () => {
  assert.deepEqual(normalizeProfile(student({ firstName: "  Ana ", studentId: " abc1234 " })), {
    firstName: "Ana",
    lastName: "Souza",
    studentId: "ABC1234",
    email: "ana@example.com",
  });
});
