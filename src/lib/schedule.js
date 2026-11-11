// The weekly schedule of a student: which shifts of which weekdays, and the
// boarding point.

import { addDays, dateKey, dayOf, departureOf, DAYS, SHIFTS } from "./dates.js";

export const BOARDING_POINTS = ["Praça (Russas)", "Cartório (Russas)", "Praça (Flores)", "Posto (Flores)"];

export function emptyGrid() {
  return Object.fromEntries(DAYS.map((d) => [d.key, Object.fromEntries(SHIFTS.map((s) => [s.key, false]))]));
}

/** Keeps only known days, shifts, and boarding points. */
export function normalizeSchedule(input = {}) {
  const grid = emptyGrid();
  for (const day of DAYS) {
    for (const shift of SHIFTS) grid[day.key][shift.key] = input.grid?.[day.key]?.[shift.key] === true;
  }
  const boardingPoint = BOARDING_POINTS.includes(input.boardingPoint) ? input.boardingPoint : "";
  return { grid, boardingPoint };
}

export function countSlots(grid) {
  return DAYS.reduce((sum, d) => sum + SHIFTS.filter((s) => grid?.[d.key]?.[s.key]).length, 0);
}

export function validateSchedule(input) {
  const errors = {};
  const schedule = normalizeSchedule(input);
  if (countSlots(schedule.grid) === 0) errors.grid = "Escolha pelo menos um turno.";
  if (!schedule.boardingPoint) errors.boardingPoint = "Escolha o ponto de embarque.";
  return errors;
}

export const tripKey = (date, shiftKey) => `${dateKey(date)}:${shiftKey}`;

/** Parses "YYYY-MM-DD:shift", or returns null. */
export function parseTripKey(key) {
  const match = /^(\d{4}-\d{2}-\d{2}):(manha|tarde|noite)$/.exec(String(key));
  return match ? { date: match[1], shift: match[2] } : null;
}

/**
 * Returns the next trip of the schedule whose bus has not left yet:
 * { key, date, day, shift, departure }, or null.
 */
export function nextTrip(schedule, now = new Date(), lookaheadDays = 14) {
  const { grid } = normalizeSchedule(schedule);
  for (let offset = 0; offset <= lookaheadDays; offset++) {
    const date = addDays(now, offset);
    const day = dayOf(date);
    if (!day) continue;
    for (const shift of SHIFTS) {
      if (!grid[day.key][shift.key]) continue;
      const departure = departureOf(date, shift.key);
      if (departure > now) return { key: tripKey(date, shift.key), date, day, shift, departure };
    }
  }
  return null;
}

export function createScheduleService(store) {
  return {
    get(userId) {
      const saved = store.get("schedules", {})[userId];
      return saved ? normalizeSchedule(saved) : null;
    },
    save(userId, input) {
      const errors = validateSchedule(input);
      if (Object.keys(errors).length) return { ok: false, errors };
      const schedule = normalizeSchedule(input);
      store.update("schedules", {}, (all) => ({ ...all, [userId]: schedule }));
      return { ok: true, schedule };
    },
    remove(userId) {
      store.update("schedules", {}, ({ [userId]: _, ...rest }) => rest);
    },
  };
}
