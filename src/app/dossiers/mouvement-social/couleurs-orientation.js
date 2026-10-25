// Couleur des ronds du triangle selon l'orientation des mesures du levier 3
// (`couleur` calculée par src/lib/releve-securite.js), dans la charte du
// dossier : capacités d'intervention en jaune, encadrement de la force en
// noir, orientation mixte en gris moyen, aucune mesure en rond blanc cerclé de
// gris. Jaune et noir s'opposent par la luminosité : ils restent distincts
// pour un daltonien. Couleurs en variables CSS (voir charte.js).
export const COULEURS_ORIENTATION = {
  capacites: "bg-(--ms-jauneFonce)",
  encadrement: "bg-(--ms-noir)",
  mixte: "bg-(--ms-gris400)",
  aucune: "bg-white ring-1 ring-inset ring-(--ms-gris400)",
};
