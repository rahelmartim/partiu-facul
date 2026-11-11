// Password hashing with PBKDF2 (Web Crypto). The app keeps its data in the
// browser, but it still never stores a password in plain text.

const ITERATIONS = 100_000;
const encoder = new TextEncoder();

const toHex = (bytes) => [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");

function fromHex(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

/** Returns n random bytes as hex. */
export function randomHex(n = 16) {
  const bytes = new Uint8Array(n);
  globalThis.crypto.getRandomValues(bytes);
  return toHex(bytes);
}

/** Returns { salt, hash } for a new password. */
export async function hashPassword(password, salt = randomHex(16), iterations = ITERATIONS) {
  const key = await globalThis.crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await globalThis.crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: fromHex(salt), iterations },
    key,
    256,
  );
  return { salt, hash: toHex(bits), iterations };
}

/** Checks a password against a stored { salt, hash, iterations }. */
export async function verifyPassword(password, stored) {
  if (!stored?.salt || !stored?.hash) return false;
  const { hash } = await hashPassword(password, stored.salt, stored.iterations ?? ITERATIONS);
  // Compare every character, so that the time does not depend on the first difference.
  let difference = hash.length ^ stored.hash.length;
  for (let i = 0; i < Math.min(hash.length, stored.hash.length); i++) {
    difference |= hash.charCodeAt(i) ^ stored.hash.charCodeAt(i);
  }
  return difference === 0;
}
