// Couleur des dossiers (/dossiers, carrousel de l'accueil) : le jaune de
// leur illustration (#f8b444), utilisé partout où un dossier a sa propre
// couleur. Classes Tailwind écrites en entier (et non construites), pour
// que Tailwind les repère dans ce fichier et les génère.
// Le jaune vif est réservé aux fonds (avec du texte noir) et aux éléments
// décoratifs : en texte sur fond blanc, il ne se lirait pas assez.
export const JAUNE_DOSSIER = "#f8b444";

export const DOSSIER = {
  fond: "bg-[#f8b444]",
  fondSurvol: "hover:bg-[#f2a42a]",
  // Nuance très claire du même jaune, pour les encadrés.
  fondClair: "bg-[#fef4de]",
  texte: "text-[#f8b444]",
  bordure: "border-[#f8b444]",
  anneau: "ring-[#f8b444]",
  anneauSurvol: "hover:ring-[#f8b444]",
  soulignement: "decoration-[#f8b444]",
};

// Nuances du même jaune, de la plus soutenue à la plus claire (barre
// d'avancement, blocs de la barre de décomposition pas encore notés).
export const NUANCES_JAUNE = ["bg-[#f8b444]", "bg-[#fac874]", "bg-[#fcdba3]", "bg-[#fdeacb]"];
