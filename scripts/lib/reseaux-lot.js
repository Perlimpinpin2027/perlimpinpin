// Mode lot de scripts/reseaux.js (--dernieres <n>) : fonctions PURES (ni base,
// ni appel à Claude, ni fichiers) pour pouvoir les tester avec `node --test`
// (scripts/reseaux-lot.test.js).

// Coût de l'étape 3 ter par fiche, observé sur les runs réels : environ 0,05 $
// quand le premier essai passe, jusqu'à 0,16 $ avec le second essai et les
// passes de raccourcissement.
export const COUT_3TER_PAR_FICHE = { min: 0.05, max: 0.16 };

export const LOT_MAX = 50;

// `analyses` : analyses publiées, de la plus récente à la plus ancienne, avec
// { id, proposition: { id } }. Garde la dernière analyse publiée de chaque
// fiche, écarte celles qui ont déjà des `reseaux` (ids dans `avecReseaux`),
// puis les `n` premières.
export function choisirFiches(analyses, avecReseaux, n) {
  const vues = new Set();
  const dernieres = analyses.filter(({ proposition }) => !vues.has(proposition.id) && vues.add(proposition.id));
  return dernieres.filter((analyse) => !avecReseaux.has(analyse.id)).slice(0, n);
}

export function estimationCout(n) {
  return {
    min: Number((n * COUT_3TER_PAR_FICHE.min).toFixed(2)),
    max: Number((n * COUT_3TER_PAR_FICHE.max).toFixed(2)),
  };
}

// Ce qui manque pour une fiche, avant tout appel : compte X du candidat et
// portrait bleu (la carte s'affiche alors sans portrait, le tweet porte le nom
// sans @).
export function alertesFiche({ compteX, portraitExiste }) {
  return [
    ...(compteX ? [] : ["compte X manquant (src/lib/handles-x.js) : le nom sera utilisé sans @"]),
    ...(portraitExiste ? [] : ["portrait bleu manquant (public/portraits-bleus) : cartes sans portrait"]),
  ];
}

// `resultats` : [{ propositionId, candidat, statut: "ecrite" | "simulee" | "echec",
// raison?, avertissements?, cout }]. Renvoie les lignes du récapitulatif.
export function recapitulatif(resultats, { dryRun = false } = {}) {
  const reussies = resultats.filter((r) => r.statut !== "echec");
  const echecs = resultats.filter((r) => r.statut === "echec");
  const total = resultats.reduce((somme, r) => somme + (r.cout ?? 0), 0);
  return [
    "=== Récapitulatif ===",
    `${dryRun ? "Fiches simulées (rien d'écrit)" : "Fiches écrites"} : ${reussies.length}`,
    ...reussies.map(
      (r) =>
        `  ✓ fiche ${r.propositionId} (${r.candidat}) : ${r.avertissements ?? 0} avertissement(s)` +
        `${r.auDela280 ? `, dont ${r.auDela280} tweet(s) au-delà de 280 (« Afficher plus »)` : ""}, ~$${(r.cout ?? 0).toFixed(4)}`,
    ),
    `Fiches en échec : ${echecs.length}`,
    ...echecs.map((r) => `  ✗ fiche ${r.propositionId} (${r.candidat}) : ${r.raison}`),
    `Coût total estimé : ~$${total.toFixed(4)}`,
  ];
}
