// Compte X de chaque candidat, inséré par le code à la place de {CANDIDAT}
// dans les publications X (voir src/lib/reseaux.js). Clé : nom exact du
// candidat en base (Candidat.nom).
//
// Comptes officiels vérifiés par Arno le 13/10/2026 ; noms identiques à
// Candidat.nom en base. Pour un nouveau candidat, ajouter son compte après
// vérification ; laissé à null (ou absent), le tweet porte le nom du
// candidat, sans @ (aucune notification).
export const HANDLES_X = {
  "Bruno Retailleau": "@BrunoRetailleau",
  "David Lisnard": "@davidlisnard",
  "Dominique de Villepin": "@Villepin",
  "Édouard Philippe": "@EPhilippe_LH",
  "Éric Zemmour": "@ZemmourEric",
  "Fabien Roussel": "@Fabien_Roussel",
  "Gabriel Attal": "@GabrielAttal",
  "Jean-Luc Mélenchon": "@JLMelenchon",
  "Marine Le Pen": "@MLP_officiel",
  "Marine Tondelier": "@marinetondelier",
  "Raphaël Glucksmann": "@rglucks1",
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
