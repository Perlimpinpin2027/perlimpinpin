import { createHmac, timingSafeEqual } from "node:crypto";

// Lien de désinscription des appels à relecture (mails envoyés par
// scripts/relecture.js) : fonctions PURES, testées avec `node --test`
// (scripts/desinscription.test.js).
//
// Jeton « <adherentId>.<signature> », signature HMAC-SHA256 avec AUTH_SECRET et
// un préfixe dédié : une signature de session (« relecture|… ») ou de /test ne
// peut jamais servir ici, et inversement. Pas d'expiration : un lien reçu il y a
// six mois doit encore fonctionner.

export const SITE_URL = "https://perlimpinpin.ai";
export const CHEMIN_PAGE = "/relectures/desinscription";
// Route POST (bouton de la page et désinscription en un clic de Gmail / Outlook,
// en-tête List-Unsubscribe-Post). Hors du proxy : aucune session exigée.
export const CHEMIN_API = "/api/relectures/desinscription";

function secretUtilisable(secret) {
  return typeof secret === "string" && secret.length > 0;
}

function signature(secret, adherentId) {
  return createHmac("sha256", secret).update(`desinscription|${adherentId}`).digest("base64url");
}

export function creerJeton({ secret, adherentId }) {
  if (!secretUtilisable(secret) || !Number.isSafeInteger(adherentId) || adherentId <= 0) {
    throw new Error("Jeton de désinscription : secret ou identifiant invalide.");
  }
  return `${adherentId}.${signature(secret, adherentId)}`;
}

// Identifiant de l'adhérent si le jeton est bien signé avec ce secret, sinon
// null (absent, mal formé, falsifié, secret absent).
export function lireJeton({ secret, jeton }) {
  if (!secretUtilisable(secret) || typeof jeton !== "string") return null;
  const morceaux = jeton.split(".");
  if (morceaux.length !== 2) return null;
  const [texteId, recue] = morceaux;
  if (!/^[1-9]\d{0,15}$/.test(texteId)) return null;
  const adherentId = Number(texteId);
  if (!Number.isSafeInteger(adherentId)) return null;

  const attendue = Buffer.from(signature(secret, adherentId));
  const recueBuffer = Buffer.from(recue);
  if (attendue.length !== recueBuffer.length) return null;
  if (!timingSafeEqual(attendue, recueBuffer)) return null;
  return adherentId;
}

// Lien de la page (bouton de confirmation) et URL de la route POST un clic.
export function liensDesinscription({ secret, adherentId, siteUrl = SITE_URL }) {
  const t = encodeURIComponent(creerJeton({ secret, adherentId }));
  return { page: `${siteUrl}${CHEMIN_PAGE}?t=${t}`, unClic: `${siteUrl}${CHEMIN_API}?t=${t}` };
}
