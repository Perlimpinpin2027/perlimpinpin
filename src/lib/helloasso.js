// Client de l'API HelloAsso v5 (lecture seule) : jeton OAuth2, lecture d'une
// commande, liste des commandes des formulaires d'adhésion. Utilisé par les routes
// /api/helloasso/* et par scripts/helloasso-sync.js (imports relatifs, sans « @/ »).
// Aucun secret ni e-mail n'est journalisé ici.
//
// Doc : dev.helloasso.com (« S'authentifier pour utiliser l'API ») : jeton
// valable 30 min ; HelloAsso demande de le prolonger avec le refresh_token
// plutôt que d'en redemander un à chaque fois.

const DELAI_MS = 10_000;
const TAILLE_PAGE = 100;
const PAGES_MAX = 50; // garde-fou : 5 000 commandes par synchronisation
const MARGE_EXPIRATION_MS = 60_000;

// Erreur d'appel HelloAsso. `passagere` : vaut la peine de réessayer plus tard
// (réseau, délai, 5xx, 429, jeton refusé) ; sinon la commande n'existe pas ou
// n'est pas accessible (404, 403…).
export class HelloassoError extends Error {
  constructor(message, { status = null, passagere = true } = {}) {
    super(message);
    this.name = "HelloassoError";
    this.status = status;
    this.passagere = passagere;
  }
}

// Cache par instance serverless (et par process pour le script)
let jeton = null; // { accessToken, expireA, refreshToken, refreshExpireA, cle }

async function appeler(url, options, libelle) {
  let reponse;
  try {
    reponse = await fetch(url, { ...options, signal: AbortSignal.timeout(DELAI_MS), cache: "no-store" });
  } catch (error) {
    const delai = error?.name === "TimeoutError" || error?.name === "AbortError";
    throw new HelloassoError(`${libelle} : ${delai ? `pas de réponse en ${DELAI_MS / 1000} s` : "réseau indisponible"}`);
  }
  return reponse;
}

async function demanderJeton(config, parametres) {
  const reponse = await appeler(
    `${config.apiBase}/oauth2/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(parametres),
    },
    "jeton HelloAsso",
  );
  if (!reponse.ok) {
    // Corps jamais journalisé (il peut rappeler les identifiants envoyés)
    throw new HelloassoError(`jeton HelloAsso refusé (HTTP ${reponse.status})`, { status: reponse.status });
  }
  const json = await reponse.json().catch(() => null);
  if (typeof json?.access_token !== "string") throw new HelloassoError("jeton HelloAsso illisible");
  const maintenant = Date.now();
  jeton = {
    cle: `${config.apiBase}|${config.clientId}`,
    accessToken: json.access_token,
    expireA: maintenant + (Number(json.expires_in) || 1800) * 1000 - MARGE_EXPIRATION_MS,
    refreshToken: typeof json.refresh_token === "string" ? json.refresh_token : null,
    // Le refresh_token vit 30 jours ; on s'en tient prudemment à 29
    refreshExpireA: maintenant + 29 * 24 * 60 * 60 * 1000,
  };
  return jeton.accessToken;
}

async function obtenirJeton(config) {
  const maintenant = Date.now();
  const memeCompte = jeton?.cle === `${config.apiBase}|${config.clientId}`;
  if (memeCompte && jeton.expireA > maintenant) return jeton.accessToken;
  if (memeCompte && jeton.refreshToken && jeton.refreshExpireA > maintenant) {
    try {
      return await demanderJeton(config, {
        grant_type: "refresh_token",
        client_id: config.clientId,
        refresh_token: jeton.refreshToken,
      });
    } catch {
      // refresh_token refusé : on repart des identifiants ci-dessous
    }
  }
  jeton = null;
  return demanderJeton(config, {
    grant_type: "client_credentials",
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });
}

// GET authentifié sur /v5 ; un 401 invalide le jeton et réessaie une fois.
async function lire(config, chemin, libelle, deuxiemeEssai = false) {
  const accessToken = await obtenirJeton(config);
  const reponse = await appeler(
    `${config.apiBase}/v5${chemin}`,
    { headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" } },
    libelle,
  );
  if (reponse.status === 401 && !deuxiemeEssai) {
    jeton = null;
    return lire(config, chemin, libelle, true);
  }
  if (!reponse.ok) {
    const passagere = reponse.status === 401 || reponse.status === 429 || reponse.status >= 500;
    throw new HelloassoError(`${libelle} : HTTP ${reponse.status}`, { status: reponse.status, passagere });
  }
  const json = await reponse.json().catch(() => null);
  if (!json) throw new HelloassoError(`${libelle} : réponse illisible`);
  return json;
}

// Commande complète (payeur, articles, paiements), relue à la source.
export async function getOrder(config, orderId) {
  if (!Number.isSafeInteger(orderId) || orderId <= 0) {
    throw new HelloassoError("identifiant de commande invalide", { passagere: false });
  }
  return lire(config, `/orders/${orderId}`, `commande ${orderId}`);
}

// Toutes les commandes des formulaires d'adhésion depuis `from` (Date), toutes pages.
export async function listMembershipOrders(config, { from }) {
  const commandes = [];
  for (const formulaire of config.formulaires) {
    commandes.push(...(await listerFormulaire(config, formulaire, from)));
  }
  return commandes;
}

async function listerFormulaire(config, formulaire, from) {
  const base =
    `/organizations/${encodeURIComponent(config.organisation)}` +
    `/forms/Membership/${encodeURIComponent(formulaire)}/orders`;
  const commandes = [];
  let continuationToken = null;
  for (let page = 1; page <= PAGES_MAX; page += 1) {
    const params = new URLSearchParams({ from: from.toISOString(), pageSize: String(TAILLE_PAGE), sortOrder: "Asc" });
    if (continuationToken) params.set("continuationToken", continuationToken);
    const json = await lire(config, `${base}?${params}`, `adhésions ${formulaire} (page ${page})`);
    const donnees = Array.isArray(json.data) ? json.data : [];
    commandes.push(...donnees);
    const suivant = json.pagination?.continuationToken;
    if (donnees.length < TAILLE_PAGE || !suivant || suivant === continuationToken) return commandes;
    continuationToken = suivant;
  }
  throw new HelloassoError(`plus de ${PAGES_MAX} pages d'adhésions (${formulaire}) : réduire la période`, { passagere: false });
}
