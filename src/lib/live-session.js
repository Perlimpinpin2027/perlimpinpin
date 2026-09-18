import { createHmac, timingSafeEqual } from "node:crypto";

// Accès partagé à l'espace /live (équipe éditoriale) : cookie de session
// signé, sans état côté serveur. Valeur = "<expiration en ms>.<signature>",
// la signature étant un HMAC-SHA256 de l'expiration. La clé de signature
// dérive à la fois de LIVE_SESSION_SECRET et de LIVE_ACCESS_PASSWORD : changer
// l'un ou l'autre invalide toutes les sessions en cours.

export const LIVE_COOKIE_NAME = "live_session";
export const LIVE_SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

function signingKey() {
  const password = process.env.LIVE_ACCESS_PASSWORD;
  const secret = process.env.LIVE_SESSION_SECRET;
  // Fail closed : sans les deux variables, aucune session n'est ni émise
  // ni acceptée.
  if (!password || !secret) return null;
  return createHmac("sha256", secret).update(password).digest();
}

function sign(payload, key) {
  return createHmac("sha256", key).update(payload).digest("hex");
}

function safeEqual(a, b) {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  return bufferA.length === bufferB.length && timingSafeEqual(bufferA, bufferB);
}

// Comparaison du mot de passe saisi à LIVE_ACCESS_PASSWORD, en temps
// constant (les deux valeurs sont d'abord hachées pour égaliser les
// longueurs).
export function isValidPassword(candidate) {
  const expected = process.env.LIVE_ACCESS_PASSWORD;
  if (!expected || typeof candidate !== "string") return false;
  const hash = (value) => createHmac("sha256", "live-password-check").update(value).digest("hex");
  return safeEqual(hash(candidate), hash(expected));
}

export function createSessionToken() {
  const key = signingKey();
  if (!key) return null;
  const expiresAt = String(Date.now() + LIVE_SESSION_MAX_AGE_SECONDS * 1000);
  return `${expiresAt}.${sign(expiresAt, key)}`;
}

export function verifySessionToken(token) {
  const key = signingKey();
  if (!key || typeof token !== "string") return false;
  const [expiresAt, signature, ...rest] = token.split(".");
  if (!expiresAt || !signature || rest.length > 0) return false;
  if (!safeEqual(signature, sign(expiresAt, key))) return false;
  return Number(expiresAt) > Date.now();
}
