import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";

// Comptes individuels de /live : identifiants et mots de passe. Les mots de passe ne
// sont jamais stockés en clair, uniquement leur hachage bcrypt (LiveUser.motDePasseHash).
// bcryptjs (JavaScript pur) : aucune dépendance native à compiler sur Vercel.

export const BCRYPT_ROUNDS = 12;
export const PASSWORD_MIN_LENGTH = 10;
// bcrypt ignore tout ce qui dépasse 72 octets : un mot de passe plus long est refusé
// plutôt que tronqué en silence.
export const PASSWORD_MAX_BYTES = 72;
const EMAIL_MAX_LENGTH = 254;

// Hachage d'un mot de passe inexistant (même coût que les vrais) : comparé quand l'adresse
// est inconnue, pour que « adresse inconnue » et « mauvais mot de passe » prennent le même
// temps et ne se distinguent pas de l'extérieur.
const DUMMY_HASH = "$2b$12$e/9y0mzFE9bH3pZfLxKrP.r6Q589SfjMCANZURB6Z37QEgbQ.3zdy";

// Adresse e-mail en minuscules (identifiant de connexion), ou null si invalide.
export function normalizeEmail(input) {
  if (typeof input !== "string") return null;
  const email = input.trim().toLowerCase();
  if (email.length === 0 || email.length > EMAIL_MAX_LENGTH) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

// Message d'erreur si le mot de passe ne convient pas pour un NOUVEAU compte, sinon null.
export function passwordProblem(password) {
  if (typeof password !== "string" || password.length < PASSWORD_MIN_LENGTH) {
    return `Le mot de passe doit faire au moins ${PASSWORD_MIN_LENGTH} caractères.`;
  }
  if (Buffer.byteLength(password, "utf8") > PASSWORD_MAX_BYTES) {
    return `Le mot de passe est trop long (${PASSWORD_MAX_BYTES} octets maximum).`;
  }
  return null;
}

export function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

// Vrai si `password` correspond à `hash`. Sans hachage (compte introuvable), on compare
// quand même à un faux hachage puis on répond faux.
export async function verifyPassword(password, hash) {
  if (typeof password !== "string" || password.length === 0 || Buffer.byteLength(password, "utf8") > 1024) {
    await bcrypt.compare("x", DUMMY_HASH);
    return false;
  }
  if (!hash) {
    await bcrypt.compare(password, DUMMY_HASH);
    return false;
  }
  return bcrypt.compare(password, hash);
}

// Mot de passe temporaire aléatoire (alphabet sans caractères ambigus : pas de 0/O, 1/l/I).
const TEMP_ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function generateTemporaryPassword(length = 16) {
  let password = "";
  for (let i = 0; i < length; i += 1) password += TEMP_ALPHABET[randomInt(TEMP_ALPHABET.length)];
  return password;
}
