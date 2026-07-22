// Barème officiel du Score Perlimpinpin (voir la page /methode, section
// "Comment fonctionne le score ?"). Source unique de vérité pour tout
// badge de score affiché sur le site — le prompt d'analyse IA
// (scripts/analyze.js, fichier texte, pas d'import possible) doit être
// tenu à jour manuellement en miroir de cette table.
const SCORE_BANDS = [
  { min: 90, max: 100, label: "Exemplaire", color: "green" },
  { min: 75, max: 89, label: "Solide et chiffré", color: "green" },
  { min: 60, max: 74, label: "Plausible sous condition", color: "orange" },
  { min: 40, max: 59, label: "Partiellement fondé", color: "orange" },
  { min: 20, max: 39, label: "Fragile", color: "red" },
  { min: 0, max: 19, label: "Irréaliste", color: "red" },
];

// Classes Tailwind associées à chaque couleur — définies une seule fois
// ici plutôt que recopiées dans chaque composant qui affiche un score.
const COLOR_CLASSES = {
  red: { score: "text-red-600", badge: "bg-red-50 text-red-700", border: "border-l-red-500" },
  orange: { score: "text-orange-600", badge: "bg-orange-50 text-orange-700", border: "border-l-orange-500" },
  green: { score: "text-green-600", badge: "bg-green-50 text-green-700", border: "border-l-green-500" },
};

export function getScoreBadge(score) {
  const band =
    SCORE_BANDS.find((entry) => score >= entry.min) ??
    SCORE_BANDS[SCORE_BANDS.length - 1];
  const classes = COLOR_CLASSES[band.color];
  return {
    label: band.label,
    color: band.color,
    scoreClass: classes.score,
    badgeClass: classes.badge,
  };
}

// Tous les paliers avec leurs classes, pour les tableaux qui affichent le
// barème complet (ex: /methode, colonne "Comment fonctionne le score ?").
// Renvoyés du plus haut score au plus bas ; utiliser .slice().reverse()
// si un affichage du plus bas au plus haut est nécessaire.
export function getScoreBands() {
  return SCORE_BANDS.map((band) => ({
    ...band,
    ...COLOR_CLASSES[band.color],
  }));
}
