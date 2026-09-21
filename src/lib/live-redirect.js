// Retour vers la bonne page après connexion à /live.
//
// Quand une page protégée est ouverte sans session (lien partagé, session
// expirée), on envoie vers /live/login?next=<page demandée>, puis on y revient
// une fois connecté. Ce paramètre vient de l'URL, donc d'un tiers potentiel :
// il n'est JAMAIS suivi tel quel. Seules les pages internes de /live sont
// acceptées (jamais un autre site, un autre schéma, ni la page de connexion
// elle-même : boucle), et le résultat est reconstruit à partir de l'URL analysée.

const LOGIN_PATH = "/live/login";
const HOME_PATH = "/live";
const MAX_LENGTH = 500;
// Origine fictive : sert uniquement à détecter une adresse qui sortirait de ce site
const PROBE_ORIGIN = "http://live.invalid";

// Retourne le chemin interne sûr (chemin + paramètres, sans ancre), ou null.
export function safeLivePath(input) {
  if (typeof input !== "string" || input.length === 0 || input.length > MAX_LENGTH) return null;
  if (!input.startsWith("/")) return null;
  // Caractères de contrôle et antislash (interprété comme « / » par les navigateurs)
  for (const char of input) {
    const code = char.charCodeAt(0);
    if (code < 32 || code === 127 || char === "\\") return null;
  }

  let url;
  try {
    url = new URL(input, PROBE_ORIGIN);
  } catch {
    return null;
  }
  // « //autre-site.fr » ou « /\autre-site.fr » sortent de l'origine
  if (url.origin !== PROBE_ORIGIN) return null;

  const { pathname } = url;
  if (pathname !== HOME_PATH && !pathname.startsWith(`${HOME_PATH}/`)) return null;
  if (pathname === LOGIN_PATH || pathname.startsWith(`${LOGIN_PATH}/`)) return null;
  return pathname + url.search;
}

// Adresse de la page de connexion qui ramènera vers `path` après connexion.
// Sans destination utile (accueil ou chemin refusé), l'adresse reste « /live/login ».
export function loginUrl(path) {
  const safe = safeLivePath(path);
  return safe && safe !== HOME_PATH ? `${LOGIN_PATH}?next=${encodeURIComponent(safe)}` : LOGIN_PATH;
}

// Destination après connexion : la page demandée si elle est sûre, sinon /live.
export function postLoginPath(next) {
  return safeLivePath(next) ?? HOME_PATH;
}
