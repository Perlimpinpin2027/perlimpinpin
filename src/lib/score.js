// Barème officiel du Score Perlimpinpin (voir la page /methode,
// section "Comment fonctionne le score ?"). Source unique de vérité pour
// tout badge de score affiché sur le site.
const SCORE_BANDS = [
  { min: 70, label: "Plutôt fondé", color: "green" },
  { min: 40, label: "Partiellement fondé", color: "orange" },
  { min: 0, label: "Non étayé", color: "red" },
];

export function getScoreBadge(score) {
  const band =
    SCORE_BANDS.find((entry) => score >= entry.min) ??
    SCORE_BANDS[SCORE_BANDS.length - 1];
  return { label: band.label, color: band.color };
}
