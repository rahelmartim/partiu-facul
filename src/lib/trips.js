// Ride confirmations ("#PARTIU") and the number of buses for each trip.

import { departureOf, parseDateKey } from "./dates.js";
import { demoConfirmations } from "./demo.js";
import { BOARDING_POINTS, parseTripKey } from "./schedule.js";

export const BUS_CAPACITY = 44;

/** Number of buses for a number of students. */
export function busesNeeded(students, capacity = BUS_CAPACITY) {
  if (!Number.isInteger(capacity) || capacity <= 0) throw new Error("capacity must be a positive integer");
  return students <= 0 ? 0 : Math.ceil(students / capacity);
}

function departureOfKey(key) {
  const trip = parseTripKey(key);
  const date = trip && parseDateKey(trip.date);
  return date ? departureOf(date, trip.shift) : null;
}

export function createTripService(store, { capacity = BUS_CAPACITY } = {}) {
  const all = () => store.get("confirmations", {});

  return {
    capacity,

    /** Confirms a student on a trip. The bus must not have left yet. */
    confirm(userId, key, boardingPoint, now = new Date()) {
      const departure = departureOfKey(key);
      if (!departure) return { ok: false, error: "Viagem inválida." };
      if (now >= departure) return { ok: false, error: "Este ônibus já saiu." };
      if (!BOARDING_POINTS.includes(boardingPoint)) return { ok: false, error: "Escolha o ponto de embarque." };
      store.update("confirmations", {}, (c) => ({
        ...c,
        [key]: { ...c[key], [userId]: { boardingPoint, at: now.toISOString() } },
      }));
      store.update("declined", {}, (d) => ({ ...d, [key]: (d[key] ?? []).filter((id) => id !== userId) }));
      return { ok: true };
    },

    /** Cancels a confirmation, and remembers it, so that auto-confirm does not undo it. */
    cancel(userId, key, now = new Date()) {
      const departure = departureOfKey(key);
      if (!departure) return { ok: false, error: "Viagem inválida." };
      if (now >= departure) return { ok: false, error: "Este ônibus já saiu." };
      store.update("confirmations", {}, (c) => {
        const { [userId]: _, ...rest } = c[key] ?? {};
        return { ...c, [key]: rest };
      });
      store.update("declined", {}, (d) => ({ ...d, [key]: [...new Set([...(d[key] ?? []), userId])] }));
      return { ok: true };
    },

    isConfirmed(userId, key) {
      return Boolean(all()[key]?.[userId]);
    },

    wasDeclined(userId, key) {
      return (store.get("declined", {})[key] ?? []).includes(userId);
    },

    /** Returns { confirmations, buses, seatsLeft, byPoint } for a trip. */
    summary(key, { includeDemo = true } = {}) {
      const real = Object.values(all()[key] ?? {});
      const demo = includeDemo ? demoConfirmations(key) : { total: 0, byPoint: {} };
      const byPoint = Object.fromEntries(BOARDING_POINTS.map((p) => [p, demo.byPoint[p] ?? 0]));
      for (const c of real) byPoint[c.boardingPoint] = (byPoint[c.boardingPoint] ?? 0) + 1;
      const confirmations = demo.total + real.length;
      const buses = busesNeeded(confirmations, capacity);
      return { confirmations, buses, seatsLeft: buses * capacity - confirmations, byPoint };
    },

    /** Trip keys that a student confirmed, oldest first. */
    history(userId) {
      return Object.entries(all())
        .filter(([, users]) => users[userId])
        .map(([key]) => key)
        .sort();
    },

    /** Removes every confirmation of a student. */
    removeUser(userId) {
      store.set(
        "confirmations",
        Object.fromEntries(
          Object.entries(all()).map(([key, users]) => {
            const { [userId]: _, ...rest } = users;
            return [key, rest];
          }),
        ),
      );
    },
  };
}

/**
 * Auto-confirm: confirms the next trip, unless the student cancelled it.
 * Returns true when it confirmed.
 */
export function autoConfirm(trips, userId, trip, boardingPoint, now = new Date()) {
  if (!trip || trips.isConfirmed(userId, trip.key) || trips.wasDeclined(userId, trip.key)) return false;
  return trips.confirm(userId, trip.key, boardingPoint, now).ok;
}
