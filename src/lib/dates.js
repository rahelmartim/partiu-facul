// Dates, weekdays, and shifts. All times use the local time of the device.

export const DAYS = [
  { key: "seg", label: "Seg", name: "Segunda-feira", weekday: 1 },
  { key: "ter", label: "Ter", name: "Terça-feira", weekday: 2 },
  { key: "qua", label: "Qua", name: "Quarta-feira", weekday: 3 },
  { key: "qui", label: "Qui", name: "Quinta-feira", weekday: 4 },
  { key: "sex", label: "Sex", name: "Sexta-feira", weekday: 5 },
];

// Each shift has a departure time. Students can confirm until the bus leaves.
export const SHIFTS = [
  { key: "manha", label: "Manhã", departure: "06:30" },
  { key: "tarde", label: "Tarde", departure: "12:00" },
  { key: "noite", label: "Noite", departure: "17:30" },
];

const pad = (n) => String(n).padStart(2, "0");

/** Returns "YYYY-MM-DD" for a date in local time. */
export function dateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Parses "YYYY-MM-DD" into a local date at midnight, or returns null. */
export function parseDateKey(key) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key));
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(year, month - 1, day);
  return date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}

/** Returns the day entry (seg to sex) of a date, or null on weekends. */
export function dayOf(date) {
  return DAYS.find((d) => d.weekday === date.getDay()) ?? null;
}

export function shiftByKey(key) {
  return SHIFTS.find((s) => s.key === key) ?? null;
}

export function dayByKey(key) {
  return DAYS.find((d) => d.key === key) ?? null;
}

/** Returns the departure of a shift on a date, as a Date. */
export function departureOf(date, shiftKey) {
  const shift = shiftByKey(shiftKey);
  if (!shift) throw new Error(`unknown shift: ${shiftKey}`);
  const [hours, minutes] = shift.departure.split(":").map(Number);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes);
}

export function addDays(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** Formats a date as "ter., 14/11", in Brazilian Portuguese. */
export function formatShortDate(date) {
  const weekday = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"][date.getDay()];
  return `${weekday}, ${pad(date.getDate())}/${pad(date.getMonth() + 1)}`;
}
