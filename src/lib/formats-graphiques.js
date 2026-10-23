// Formats français des valeurs des graphiques du dossier « Mouvement social »
// (virgule décimale, espace des milliers, espace avant « % »). Fonctions
// pures, testées dans scripts/formats-graphiques.test.js.
//
// Espaces insécables ordinaires (U+00A0) partout : Intl renvoie selon les
// versions une espace fine (U+202F) ou non, ce qui ferait différer le rendu du
// serveur et du navigateur.

const ESPACE = " ";

const FORMAT = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });

export function formaterNombre(nombre) {
  return FORMAT.format(nombre).replace(/[  \s]/g, ESPACE);
}

// Valeur selon l'unité du graphique : « % » -> « 9,1 % » ; « k » (milliers)
// -> « 256 000 » ; sans unité -> le nombre seul.
export function formaterValeur(valeur, unite) {
  if (unite === "%") return `${formaterNombre(valeur)}${ESPACE}%`;
  if (unite === "k") return formaterNombre(valeur * 1000);
  return formaterNombre(valeur);
}

// Texte affiché pour une donnée : son `libelle` s'il existe (ex. « ≈ 2 500 »,
// « −8 % »), sinon sa valeur formatée.
export function texteDonnee(donnee, unite) {
  return donnee.libelle ?? formaterValeur(donnee.valeur, unite);
}

// Haut de l'échelle : `max` du graphique, sinon la plus grande valeur + 15 %.
export function hautEchelle(max, valeurs) {
  if (max) return max;
  const plusGrande = Math.max(0, ...valeurs);
  return plusGrande ? plusGrande * 1.15 : 1;
}
