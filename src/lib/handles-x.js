// Compte X de chaque candidat, inséré par le code à la place de {CANDIDAT}
// dans les publications X (voir src/lib/reseaux.js). Clé : nom exact du
// candidat en base (Candidat.nom).
//
// À REMPLIR ET À VÉRIFIER PAR ARNO avant toute publication : le compte doit
// être le compte officiel et actif du candidat. Laissé à null, le tweet
// porte le nom du candidat, sans @ (aucune notification).
export const HANDLES_X = {
  "Bruno Retailleau": null,
  "David Lisnard": null,
  "Dominique de Villepin": null,
  "Édouard Philippe": null,
  "Éric Zemmour": null,
  "Fabien Roussel": null,
  "Gabriel Attal": null,
  "Jean-Luc Mélenchon": null,
  "Marine Le Pen": null,
  "Marine Tondelier": null,
  "Raphaël Glucksmann": null,
};

// Comparaison sans accents ni majuscules : « Edouard Philippe » en base
// retrouve bien « Édouard Philippe » ici.
function cle(nom) {
  return String(nom ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// « @compte » si le compte est renseigné (avec ou sans @ dans la table), sinon null.
export function handleX(nom, table = HANDLES_X) {
  const entree = Object.entries(table).find(([candidat]) => cle(candidat) === cle(nom));
  const compte = entree?.[1];
  if (typeof compte !== "string" || !/^@?\w{1,15}$/.test(compte.trim())) return null;
  return `@${compte.trim().replace(/^@/, "")}`;
}
