import { createInterface } from "node:readline/promises";

// Garde-fou des scripts qui écrivent en base (import-adherents, reset-adherent,
// marquer-retenus, helloasso-sync) : avant toute écriture, affiche l'hôte Neon
// réellement ciblé, dit clairement si c'est la PRODUCTION ou une COPIE / TEST,
// et demande de taper « oui ».
//
// La production est identifiée par son hôte Neon, fixé ici, et non par le
// fichier .env : un .env peut pointer vers une copie (incident du 30/09/2026,
// où la copie ep-delicate-sky a été prise pour la production).
//
// `import "dotenv/config"` ne remplace PAS une variable déjà définie : pour viser
// une autre base, on définit DATABASE_URL dans le terminal avant de lancer le
// script, et c'est elle qui est utilisée (et affichée ici).

// Branche principale Neon, utilisée par le site en production (Vercel).
// Hôte direct « ep-shiny-leaf-as4ydnda.… » ou pooler « ep-shiny-leaf-as4ydnda-pooler.… ».
export const HOTE_PRODUCTION = "ep-shiny-leaf-as4ydnda";

export function hoteDe(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

// Vrai si l'hôte est celui de la base de production (direct ou pooler).
export function estProduction(host) {
  if (typeof host !== "string") return false;
  const h = host.toLowerCase();
  return h.startsWith(`${HOTE_PRODUCTION}.`) || h.startsWith(`${HOTE_PRODUCTION}-pooler.`);
}

// Lignes d'avertissement affichées avant confirmation.
export function avertissementBase(host) {
  if (estProduction(host)) {
    return [
      `Base ciblée : ${host}`,
      "⚠  PRODUCTION : c'est la vraie base du site perlimpinpin.ai (branche Neon principale).",
    ];
  }
  return [
    `Base ciblée : ${host ?? "(illisible)"}`,
    "COPIE / TEST : ce n'est PAS la base de production. Le site en ligne ne verra pas ces changements.",
  ];
}

// Affiche la base ciblée ; vrai seulement si l'utilisateur tape « oui ».
export async function confirmerEcriture({ host, question }) {
  console.log("");
  for (const ligne of avertissementBase(host)) console.log(ligne);
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const reponse = await rl.question(`${question} Tapez « oui » pour confirmer : `);
    return reponse.trim().toLowerCase() === "oui";
  } finally {
    rl.close();
  }
}
