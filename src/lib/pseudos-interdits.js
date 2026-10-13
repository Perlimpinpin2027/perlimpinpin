// Mots interdits dans les pseudonymes du Club Perlimpinpin.
//
// Un pseudo est refusé s'il CONTIENT l'un de ces mots, sans tenir compte des
// majuscules, des accents, ni des espaces, points, tirets et soulignés
// (« Le Pen », « le-pen », « LEPEN » et « Lé.Pen » sont tous refusés).
//
// Pour modifier la liste, ajoutez ou retirez simplement une ligne : l'écriture
// (majuscules, accents, espaces) n'a pas d'importance.
export const MOTS_INTERDITS = [
  // Équipe et modération
  "perlimpinpin",
  "admin",
  "modo",
  "moderateur",
  "equipe",
  "staff",

  // Candidats
  "le Pen",
  "Melenchon",
  "Philippe",
  "Glucksmann",
  "Attal",
  "Tondelier",
  "Retailleau",
  "Zemmour",
  "Villepin",
  "Lisnard",
  "Roussel",
];
