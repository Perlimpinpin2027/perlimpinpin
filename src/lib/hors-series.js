import RN_PLAN_BUDGETAIRE from "../../data/hors-series/rn-plan-budgetaire.json" with { type: "json" };

// Registre des hors-séries (pages /hors-serie/[slug]). Chaque JSON de
// data/hors-series/ est importé statiquement, et non lu avec fs à la
// requête : le bundler l'embarque ainsi dans la fonction déployée sur
// Vercel. Pour ajouter un hors-série : importer son JSON ci-dessus et
// l'ajouter à la liste.
const HORS_SERIES = [RN_PLAN_BUDGETAIRE];

const PAR_SLUG = new Map(HORS_SERIES.map((hs) => [hs.slug, hs]));

export function getHorsSerie(slug) {
  return PAR_SLUG.get(slug) ?? null;
}

export function getHorsSerieSlugs() {
  return HORS_SERIES.map((hs) => hs.slug);
}
