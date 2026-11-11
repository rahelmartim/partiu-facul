// Checks for the values that the student types. Each function returns an
// error message in Portuguese, or null when the value is valid.

export const LIMITS = { name: 60, email: 120, studentId: 20, passwordMin: 6, passwordMax: 128 };

const clean = (value) => String(value ?? "").trim();

export function validateName(value, label = "Nome") {
  const name = clean(value);
  if (!name) return `${label} é obrigatório.`;
  if (name.length > LIMITS.name) return `${label} pode ter no máximo ${LIMITS.name} caracteres.`;
  if (!/^[\p{L}][\p{L}' .-]*$/u.test(name)) return `${label} deve ter apenas letras.`;
  return null;
}

export function validateEmail(value) {
  const email = clean(value);
  if (!email) return "E-mail é obrigatório.";
  if (email.length > LIMITS.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Digite um e-mail válido.";
  return null;
}

export function validateStudentId(value) {
  const id = clean(value);
  if (!id) return "ID universitário é obrigatório.";
  if (!/^[A-Za-z0-9]{4,20}$/.test(id)) return "O ID universitário deve ter de 4 a 20 letras ou números.";
  return null;
}

export function validatePassword(value) {
  const password = String(value ?? "");
  if (password.length < LIMITS.passwordMin) return `A senha deve ter pelo menos ${LIMITS.passwordMin} caracteres.`;
  if (password.length > LIMITS.passwordMax) return `A senha pode ter no máximo ${LIMITS.passwordMax} caracteres.`;
  return null;
}

/** Checks a profile. Returns an object with one message per invalid field. */
export function validateProfile(profile, { requirePassword = true } = {}) {
  const errors = {};
  const checks = {
    firstName: validateName(profile.firstName, "Nome"),
    lastName: validateName(profile.lastName, "Sobrenome"),
    studentId: validateStudentId(profile.studentId),
    email: validateEmail(profile.email),
  };
  if (requirePassword || profile.password) checks.password = validatePassword(profile.password);
  for (const [field, message] of Object.entries(checks)) if (message) errors[field] = message;
  return errors;
}

/** Returns the profile with trimmed values and a lower-case e-mail. */
export function normalizeProfile(profile) {
  return {
    firstName: clean(profile.firstName),
    lastName: clean(profile.lastName),
    studentId: clean(profile.studentId).toUpperCase(),
    email: clean(profile.email).toLowerCase(),
  };
}
