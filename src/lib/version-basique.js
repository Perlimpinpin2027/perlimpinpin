import { readFileSync } from "node:fs";
import { join } from "node:path";

// Version basique d'une fiche (contenuComplet.version_basique, produite par
// l'étape 3 bis, voir scripts/analyze.js). Renvoie null si elle est absente
// ou mal formée : la page s'affiche alors exactement comme avant.
//
// TEMPORAIRE, développement uniquement : sans version_basique en base, on lit
// data/versions-basiques-dev/<propositionId>.json ({ "version_basique": {...} }),
// pour tester l'affichage sans écrire en base. Dossier ignoré par git.
export function lireVersionBasique(contenu, propositionId) {
  let versionBasique = contenu?.version_basique ?? null;

  if (!versionBasique && process.env.NODE_ENV !== "production") {
    try {
      const chemin = join(process.cwd(), "data", "versions-basiques-dev", `${propositionId}.json`);
      versionBasique = JSON.parse(readFileSync(chemin, "utf-8")).version_basique ?? null;
    } catch {
      versionBasique = null;
    }
  }

  const valide =
    versionBasique &&
    typeof versionBasique.resume === "string" &&
    Array.isArray(versionBasique.points_forts) &&
    Array.isArray(versionBasique.points_faibles);
  return valide ? versionBasique : null;
}
