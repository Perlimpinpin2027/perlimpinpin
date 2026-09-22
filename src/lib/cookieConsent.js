const STORAGE_KEY = "ppp_cookie_consent";
// ~6 mois, durée max recommandée par la CNIL pour la validité d'un consentement.
const CONSENT_MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000;

export const CONSENT_CHANGED_EVENT = "ppp:cookie-consent-changed";
export const REOPEN_CONSENT_EVENT = "ppp:reopen-cookie-consent";

// Lit le consentement stocké ; renvoie null s'il est absent, corrompu, ou
// expiré (au-delà de CONSENT_MAX_AGE_MS le bandeau doit redemander le choix).
export function getStoredConsent() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.timestamp !== "number") return null;
    if (Date.now() - parsed.timestamp > CONSENT_MAX_AGE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function storeConsent(categories) {
  const value = { categories, timestamp: Date.now() };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // localStorage indisponible (navigation privée stricte, quota…) : le
    // bandeau réapparaîtra au prochain chargement, ce n'est pas bloquant.
  }
  window.dispatchEvent(new CustomEvent(CONSENT_CHANGED_EVENT, { detail: value }));
}

// Efface le choix et rouvre le bandeau — prévu pour un futur lien "Gérer
// les cookies" (footer à venir) ; ré-exploitable dès que le footer existe.
export function reopenConsentBanner() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(REOPEN_CONSENT_EVENT));
}
