// Demo classmates. The app has no server, so on its own it would show only
// your confirmation. With demo data on, each trip also gets a repeatable
// number of other students, so that the bus counter makes sense.

import { BOARDING_POINTS, parseTripKey } from "./schedule.js";

const RANGES = { manha: [30, 70], tarde: [15, 45], noite: [45, 95] };

/** FNV-1a hash of a string. */
export function hashString(text) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Mulberry32: a small seeded random number generator. */
export function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Returns { total, byPoint } of demo classmates for a trip key. */
export function demoConfirmations(key) {
  const trip = parseTripKey(key);
  if (!trip) return { total: 0, byPoint: {} };
  const random = seededRandom(hashString(key));
  const [low, high] = RANGES[trip.shift];
  const total = low + Math.floor(random() * (high - low + 1));
  const weights = BOARDING_POINTS.map(() => 0.5 + random());
  const sum = weights.reduce((a, b) => a + b, 0);
  const byPoint = {};
  let given = 0;
  BOARDING_POINTS.forEach((point, i) => {
    const share = i === BOARDING_POINTS.length - 1 ? total - given : Math.floor((total * weights[i]) / sum);
    byPoint[point] = share;
    given += share;
  });
  return { total, byPoint };
}
