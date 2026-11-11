import { createAuth } from "../src/lib/auth.js";
import { createStore, memoryStorage } from "../src/lib/storage.js";

export function stores() {
  return { store: createStore(memoryStorage()), temporary: createStore(memoryStorage()) };
}

export const student = (overrides = {}) => ({
  firstName: "Ana",
  lastName: "Souza",
  studentId: "abc1234",
  email: "Ana@Example.com",
  password: "segredo123",
  ...overrides,
});

/** A clock that tests can move forward. */
export function clock(start = new Date(2026, 10, 10, 8, 0)) {
  let time = start.getTime();
  const now = () => new Date(time);
  now.advance = (ms) => {
    time += ms;
  };
  return now;
}

export function authWith(options = {}) {
  const { store, temporary } = stores();
  return { store, temporary, auth: createAuth({ store, temporary, ...options }) };
}
