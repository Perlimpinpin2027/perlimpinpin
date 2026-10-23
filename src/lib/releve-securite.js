// Calculs tirés du relevé des prises de parole des candidats sur la sécurité
// (data/hors-series/inventaire-prises-de-parole.json, remplacé à chaque
// actualisation) pour le dossier « Mouvement social » : triangle des leviers
// et section « Le relevé complet ». Fonctions pures, sans import du site,
// testées dans scripts/releve-securite.test.js.

// Levier d'une mesure (1, 2 ou 3) -> clé du compte.
const CLE_LEVIER = { 1: "moyens", 2: "responsabilite", 3: "methodes" };

// Couleur d'un candidat d'après l'orientation de ses mesures du levier 3.
export function couleurOrientation(capacites, encadrement) {
  if (capacites > encadrement) return "capacites";
  if (encadrement > capacites) return "encadrement";
  return capacites > 0 ? "mixte" : "aucune";
}

// Compte, pour chaque candidat du relevé, ses mesures retenues par levier et,
// pour le levier 3, par orientation. Les mesures non retenues sont ignorées.
// Candidats dans l'ordre alphabétique de `nomTri`.
export function compterParCandidat(inventaire) {
  const comptes = new Map(
    inventaire.candidats.map((c) => [
      c.candidat,
      {
        candidat: c.candidat,
        nomTri: c.nomTri,
        parti: c.parti,
        moyens: 0,
        responsabilite: 0,
        methodes: 0,
        capacites: 0,
        encadrement: 0,
      },
    ]),
  );

  for (const mesure of inventaire.mesures) {
    const compte = comptes.get(mesure.candidat);
    const cle = CLE_LEVIER[mesure.levier];
    if (!mesure.retenue || !compte || !cle) continue;
    compte[cle] += 1;
    if (mesure.levier === 3 && (mesure.orientation === "capacites" || mesure.orientation === "encadrement")) {
      compte[mesure.orientation] += 1;
    }
  }

  return [...comptes.values()]
    .map((c) => ({
      ...c,
      total: c.moyens + c.responsabilite + c.methodes,
      couleur: couleurOrientation(c.capacites, c.encadrement),
    }))
    .sort((a, b) => a.nomTri.localeCompare(b.nomTri, "fr"));
}

// Position d'un candidat dans le triangle : part de ses mesures dans chaque
// levier (coordonnées barycentriques, somme 1). null sans mesure retenue.
export function partsLeviers({ moyens, responsabilite, methodes }) {
  const total = moyens + responsabilite + methodes;
  if (!total) return null;
  return { moyens: moyens / total, responsabilite: responsabilite / total, methodes: methodes / total };
}

// Mesures du relevé groupées par candidat (ordre de `nomTri`), triées par
// date ; les mesures sans date (« antérieur ») passent en premier.
export function mesuresParCandidat(inventaire) {
  const comptes = new Map(compterParCandidat(inventaire).map((c) => [c.candidat, c]));
  return [...comptes.values()].map((compte) => ({
    ...compte,
    mesures: inventaire.mesures
      .filter((m) => m.candidat === compte.candidat)
      .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? "")),
  }));
}
