import RN_PLAN_BUDGETAIRE from "../../data/hors-series/rn-plan-budgetaire.json" with { type: "json" };

// Registre des dossiers (pages /dossiers/[slug], listées sur /dossiers
// et mises en avant dans le carrousel de l'accueil). Chaque JSON de
// data/hors-series/ est importé statiquement, et non lu avec fs à la
// requête : le bundler l'embarque ainsi dans la fonction déployée sur
// Vercel. Pour ajouter un hors-série : importer son JSON ci-dessus et
// l'ajouter à la liste (le plus récent en premier).
const HORS_SERIES = [RN_PLAN_BUDGETAIRE];

const PAR_SLUG = new Map(HORS_SERIES.map((hs) => [hs.slug, hs]));

export function getHorsSerie(slug) {
  return PAR_SLUG.get(slug) ?? null;
}

export function getHorsSerieSlugs() {
  return HORS_SERIES.map((hs) => hs.slug);
}

// Tous les hors-séries, le plus récent en premier (page /dossiers).
export function getHorsSeries() {
  return HORS_SERIES;
}

// Avancement d'un hors-série : nombre de fiches par statut, dans l'ordre
// des fiches (pour la barre d'avancement des cartes).
export function avancementHorsSerie(hs) {
  const statuts = hs.fiches.map((fiche) => fiche.statut);
  return {
    statuts,
    total: statuts.length,
    publiees: statuts.filter((s) => s === "publiee").length,
    enRelecture: statuts.filter((s) => s === "relecture").length,
    aVenir: statuts.filter((s) => s === "a_venir").length,
  };
}

// Phrase d'avancement lisible, ex. « 1 fiche en relecture · 4 à venir ».
export function texteAvancement({ publiees, enRelecture, aVenir }) {
  const morceaux = [];
  if (publiees) morceaux.push(`${publiees} fiche${publiees > 1 ? "s" : ""} publiée${publiees > 1 ? "s" : ""}`);
  if (enRelecture) morceaux.push(`${enRelecture} en relecture`);
  if (aVenir) morceaux.push(`${aVenir} à venir`);
  return morceaux.join(" · ");
}

// Dossiers à afficher dans le carrousel de l'accueil (bloc `accueil` du
// JSON, avec `afficher: true`), réduits aux seules données utiles à la
// carte, qui est un composant client (le JSON complet n'est ainsi pas
// envoyé au navigateur). Ils y sont rangés à leur date de mise en ligne
// (`datePublication`) parmi les analyses, voir getFeaturedRotation ; avec
// `accueil.enTete: true`, le dossier passe en première carte.
export function getHorsSeriesAccueil() {
  return HORS_SERIES.filter((hs) => hs.accueil?.afficher).map((hs) => {
    const avancement = avancementHorsSerie(hs);
    return {
      slug: hs.slug,
      numero: hs.numero,
      etiquette: hs.etiquette,
      // Titre court pour la carte (limitée à 3 lignes comme les autres),
      // sinon le titre complet.
      titre: hs.accueil.titre ?? hs.titre,
      motItalique: hs.motItalique,
      accroche: hs.accueil.accroche,
      datePublication: hs.datePublication,
      enTete: hs.accueil.enTete === true,
      photo: hs.photo,
      candidat: hs.candidat,
      avancement,
      texteAvancement: texteAvancement(avancement),
    };
  });
}
