import { createHash, createHmac, timingSafeEqual } from "node:crypto";

// Cœur du « code d'édition » de /test : fonctions PURES (ni Next, ni cookies, ni
// base) pour pouvoir les tester avec `node --test` (scripts/test-auth.test.js).
// La partie qui lit le cookie de la requête est dans src/lib/test-auth.js.

export const EDIT_COOKIE_NAME = "ppp_test_edit";
export const EDIT_SESSION_MS = 12 * 60 * 60 * 1000; // 12 h
export const EDIT_CODE_MIN_LENGTH = 12;

// Le code n'est utilisable que s'il est présent et assez long. Sinon, échec
// fermé : personne ne peut s'authentifier.
export function codeUtilisable(code) {
  return typeof code === "string" && code.length >= EDIT_CODE_MIN_LENGTH;
}

// Le secret de signature (AUTH_SECRET, partagé avec /live) doit exister.
export function secretUtilisable(secret) {
  return typeof secret === "string" && secret.length > 0;
}

function sha256(texte) {
  return createHash("sha256").update(texte, "utf8").digest();
}

// Comparaison à temps constant : on compare les hachages SHA-256 (toujours 32
// octets) plutôt que les textes bruts, dont la longueur pourrait fuiter.
export function codesIdentiques(saisi, attendu) {
  if (typeof saisi !== "string" || typeof attendu !== "string") return false;
  return timingSafeEqual(sha256(saisi), sha256(attendu));
}

// Signature HMAC-SHA256 de « date d'expiration + empreinte du code ». Lier la
// signature au code fait qu'en changeant TEST_EDIT_CODE, tous les cookies déjà
// émis cessent d'être valides (c'est l'interrupteur pour révoquer les accès).
function signature(secret, code, expiration) {
  return createHmac("sha256", secret)
    .update(`test-edit|${expiration}|${sha256(code).toString("hex")}`)
    .digest("base64url");
}

// Valeur du cookie : « <expiration en ms>.<signature> ».
export function creerSession({ secret, code, maintenant = Date.now() }) {
  if (!secretUtilisable(secret) || !codeUtilisable(code)) {
    throw new Error("Configuration du code d'édition invalide.");
  }
  const expiration = maintenant + EDIT_SESSION_MS;
  return `${expiration}.${signature(secret, code, expiration)}`;
}

// Vrai seulement si la valeur est bien signée avec ce secret et ce code, et pas
// expirée. Toute anomalie (absente, mal formée, falsifiée…) donne faux.
export function sessionValide({ secret, code, valeur, maintenant = Date.now() }) {
  if (!secretUtilisable(secret) || !codeUtilisable(code)) return false;
  if (typeof valeur !== "string") return false;

  const morceaux = valeur.split(".");
  if (morceaux.length !== 2) return false;
  const [texteExpiration, recue] = morceaux;
  if (!/^\d{1,16}$/.test(texteExpiration)) return false;

  const attendue = Buffer.from(signature(secret, code, texteExpiration));
  const recueBuffer = Buffer.from(recue);
  // timingSafeEqual exige des longueurs identiques (sinon il lève une erreur).
  if (attendue.length !== recueBuffer.length) return false;
  if (!timingSafeEqual(attendue, recueBuffer)) return false;

  return Number(texteExpiration) > maintenant;
}
