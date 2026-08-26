// Barème officiel du Score Perlimpinpin, 6 paliers (voir la page /methode,
// section "La note finale"). Source unique de vérité pour tout badge de
// score affiché sur le site — le prompt d'analyse IA (scripts/analyze.js,
// fichier texte, pas d'import possible) doit être tenu à jour manuellement
// en miroir de cette table. Le score numérique stocké (0-100) ne change
// jamais : seuls le libellé, la couleur et la description dépendent de
// cette table, recalculés à l'affichage.
const SCORE_BANDS = [
  {
    min: 90,
    max: 100,
    label: "Exemplaire",
    color: "green-dark",
    description:
      "La mesure est à la fois pertinente, bien conçue, documentée et facilement applicable.",
  },
  {
    min: 75,
    max: 89,
    label: "Solide et chiffré",
    color: "green",
    description:
      "La mesure est étayée par des données robustes et réaliste dans le cadre actuel.",
  },
  {
    min: 60,
    max: 74,
    label: "Plausible sous condition",
    color: "amber",
    description:
      "La mesure est globalement cohérente mais dépend de conditions de mise en œuvre ou de ressources incertaines.",
  },
  {
    min: 40,
    max: 59,
    label: "Partiellement fondé",
    color: "orange",
    description:
      "Une partie des règles proposées existe déjà ou repose sur des bases solides, mais des points restent fragiles.",
  },
  {
    min: 20,
    max: 39,
    label: "Fragile",
    color: "red",
    description:
      "De nombreuses incertitudes ou contradictions affaiblissent fortement la proposition.",
  },
  {
    min: 0,
    max: 19,
    label: "Irréaliste",
    color: "red-dark",
    description:
      "La mesure est hors-sol ou en contradiction majeure avec les faits ou le cadre légal.",
  },
];

// Classes Tailwind associées à chaque couleur — définies une seule fois ici
// plutôt que recopiées dans chaque composant qui affiche un score. 6
// couleurs distinctes (et non 3 partagées par 2 paliers) pour que les
// paliers voisins (ex. Fragile/Irréaliste, Exemplaire/Solide et chiffré)
// restent visuellement différenciables partout où ils apparaissent
// côte à côte (classement, tableau /methode).
const COLOR_CLASSES = {
  "red-dark": {
    score: "text-red-800",
    badge: "bg-red-100 text-red-800",
    border: "border-l-red-800",
    flag: "text-red-800",
  },
  red: {
    score: "text-red-600",
    badge: "bg-rose-100 text-rose-700",
    border: "border-l-red-500",
    flag: "text-red-600",
  },
  orange: {
    score: "text-orange-600",
    badge: "bg-orange-50 text-orange-700",
    border: "border-l-orange-500",
    flag: "text-orange-500",
  },
  amber: {
    score: "text-amber-600",
    badge: "bg-amber-50 text-amber-700",
    border: "border-l-amber-500",
    flag: "text-amber-500",
  },
  green: {
    score: "text-green-600",
    badge: "bg-green-50 text-green-700",
    border: "border-l-green-500",
    flag: "text-green-600",
  },
  "green-dark": {
    score: "text-emerald-800",
    badge: "bg-emerald-100 text-emerald-800",
    border: "border-l-emerald-700",
    flag: "text-emerald-700",
  },
};

export function getScoreBadge(score) {
  const band =
    SCORE_BANDS.find((entry) => score >= entry.min) ??
    SCORE_BANDS[SCORE_BANDS.length - 1];
  const classes = COLOR_CLASSES[band.color];
  return {
    label: band.label,
    color: band.color,
    description: band.description,
    scoreClass: classes.score,
    badgeClass: classes.badge,
    flagClass: classes.flag,
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
