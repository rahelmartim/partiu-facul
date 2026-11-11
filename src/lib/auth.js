// Accounts and sessions. Users live in the persistent store. The session
// token lives in the persistent store with "keep me logged in", and in the
// temporary store (sessionStorage) without it.

import { hashPassword, randomHex, verifyPassword } from "./crypto.js";
import { normalizeProfile, validateProfile } from "./validation.js";

export const MAX_FAILED_LOGINS = 5;
export const LOCK_MS = 30_000;

const LOGIN_ERROR = "E-mail/ID ou senha incorretos.";

/** Returns a user without the password data. */
export function publicUser(user) {
  if (!user) return null;
  const { password, ...rest } = user;
  return rest;
}

export function createAuth({ store, temporary, now = () => new Date() }) {
  const users = () => store.get("users", {});
  const saveUsers = (value) => store.set("users", value);

  function findByIdentifier(identifier) {
    const value = String(identifier ?? "").trim();
    return Object.values(users()).find(
      (u) => u.email === value.toLowerCase() || u.studentId === value.toUpperCase(),
    );
  }

  function uniquenessErrors(profile, exceptId = null) {
    const errors = {};
    for (const user of Object.values(users())) {
      if (user.id === exceptId) continue;
      if (user.email === profile.email) errors.email = "Este e-mail já está cadastrado.";
      if (user.studentId === profile.studentId) errors.studentId = "Este ID universitário já está cadastrado.";
    }
    return errors;
  }

  function failures() {
    return store.get("loginFailures", { count: 0, lockedUntil: 0 });
  }

  return {
    async register(input) {
      const profile = normalizeProfile(input);
      // A format error is more useful than "already registered", so it wins.
      const errors = { ...uniquenessErrors(profile), ...validateProfile(input) };
      if (Object.keys(errors).length) return { ok: false, errors };

      const user = {
        id: randomHex(8),
        ...profile,
        password: await hashPassword(String(input.password)),
        createdAt: now().toISOString(),
      };
      saveUsers({ ...users(), [user.id]: user });
      return { ok: true, user: publicUser(user) };
    },

    async login(identifier, password, { remember = false } = {}) {
      const state = failures();
      const time = now().getTime();
      if (state.lockedUntil > time) {
        const seconds = Math.ceil((state.lockedUntil - time) / 1000);
        return { ok: false, error: `Muitas tentativas. Tente de novo em ${seconds} s.` };
      }
      const user = findByIdentifier(identifier);
      const valid = user ? await verifyPassword(String(password ?? ""), user.password) : false;
      if (!valid) {
        const count = state.count + 1;
        store.set("loginFailures", {
          count: count >= MAX_FAILED_LOGINS ? 0 : count,
          lockedUntil: count >= MAX_FAILED_LOGINS ? time + LOCK_MS : 0,
        });
        return { ok: false, error: LOGIN_ERROR };
      }
      store.remove("loginFailures");
      const token = randomHex(24);
      store.update("sessions", {}, (s) => ({ ...s, [token]: { userId: user.id, createdAt: now().toISOString() } }));
      (remember ? store : temporary).set("session", token);
      (remember ? temporary : store).remove("session");
      return { ok: true, user: publicUser(user) };
    },

    logout() {
      for (const place of [temporary, store]) {
        const token = place.get("session");
        if (token) store.update("sessions", {}, ({ [token]: _, ...rest }) => rest);
        place.remove("session");
      }
    },

    currentUser() {
      const token = temporary.get("session") ?? store.get("session");
      const session = token ? store.get("sessions", {})[token] : null;
      return session ? publicUser(users()[session.userId]) : null;
    },

    async updateProfile(userId, input) {
      const all = users();
      const user = all[userId];
      if (!user) return { ok: false, errors: { form: "Usuário não encontrado." } };
      const profile = normalizeProfile(input);
      const errors = { ...uniquenessErrors(profile, userId), ...validateProfile(input, { requirePassword: false }) };
      if (Object.keys(errors).length) return { ok: false, errors };

      const updated = { ...user, ...profile };
      if (input.password) updated.password = await hashPassword(String(input.password));
      saveUsers({ ...all, [userId]: updated });
      return { ok: true, user: publicUser(updated) };
    },

    /** Removes the account and every session of it. */
    deleteAccount(userId) {
      const { [userId]: _, ...rest } = users();
      saveUsers(rest);
      store.update("sessions", {}, (s) =>
        Object.fromEntries(Object.entries(s).filter(([, session]) => session.userId !== userId)),
      );
      this.logout();
    },
  };
}
