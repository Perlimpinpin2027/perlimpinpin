// Constantes partagées par la configuration Auth.js (src/auth.js) et le proxy
// (src/proxy.js), qui lit le cookie sans charger toute la configuration.

// Nom du cookie de session. C'est aussi le « salt » du chiffrement du JWT : il doit être
// identique partout où la session est lue.
export const LIVE_COOKIE_NAME = "live_auth";
export const LIVE_SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;
