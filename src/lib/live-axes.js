// Niveau des trois axes de synthèse (Chiffrage, Faisabilité, Impact) calculé à
// partir des notes du barème, pour colorer les mini-cartes de la page
// d'analyse. Le texte de chaque axe est rédigé par l'analyse ; ceci n'est qu'un
// repère visuel (rouge / orange / vert), jamais un nouveau score.
//
// Correspondance avec le barème :
//   - Chiffrage   : sous-critère budgétaire ;
//   - Faisabilité : sous-critères juridique et moyens humains + degré de
//     préparation (les moyens humains, oubliés d'une première correspondance,
//     relèvent de la faisabilité concrète) ;
//   - Impact      : efficacité + effets rebonds & externalités.
// « Alignement & logique » n'est rattaché à aucun axe (il compte dans le score
// global et dans le détail de l'analyse).

const ratio = (value, max) => {
  const number = Number(value);
  return Number.isFinite(number) && max > 0 ? Math.min(1, Math.max(0, number / max)) : 0;
};
const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;

// Retourne { chiffrage, faisabilite, impact } (0 à 1, moyenne des mesures), ou
// null s'il n'y a aucune mesure.
export function axisLevels(mesures) {
  const perMesure = (Array.isArray(mesures) ? mesures : [])
    .map((mesure) => mesure?.notation_detaillee)
    .filter(Boolean)
    .map((notation) => ({
      chiffrage: ratio(notation.operationnalite_budgetaire, 10),
      faisabilite: mean([
        ratio(notation.operationnalite_juridique, 10),
        ratio(notation.operationnalite_moyens_humains, 10),
        ratio(notation.degre_preparation, 10),
      ]),
      impact: mean([ratio(notation.efficacite, 30), ratio(notation.effets_rebonds_externalites, 20)]),
    }));
  if (perMesure.length === 0) return null;
  return {
    chiffrage: mean(perMesure.map((axes) => axes.chiffrage)),
    faisabilite: mean(perMesure.map((axes) => axes.faisabilite)),
    impact: mean(perMesure.map((axes) => axes.impact)),
  };
}

// Tiers : moins d'un tiers = rouge, jusqu'aux deux tiers = orange, au-delà = vert.
export function levelTone(level) {
  if (level < 1 / 3) return "red";
  if (level < 2 / 3) return "amber";
  return "green";
}
