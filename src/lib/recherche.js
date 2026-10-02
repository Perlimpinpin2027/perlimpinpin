// Recherche par mots-clés dans les déclarations publiées (barre de recherche
// de la page d'accueil -> /declarations?q=...).
//
// Volontairement simple : le nombre d'analyses publiées est faible, on filtre
// donc en JavaScript plutôt qu'en base. Avantage : la recherche ignore les
// accents et les majuscules (« energie » trouve « Énergie »), ce que Postgres
// ne fait pas tout seul.

// Petits mots ignorés (« prix du carburant » -> « prix », « carburant »).
const MOTS_VIDES = new Set([
  "le", "la", "les", "de", "du", "des", "un", "une", "et", "ou", "a", "au",
  "aux", "en", "pour", "par", "sur", "dans", "avec", "sans", "d", "l",
]);

// « Énergie & Climat » -> « energie climat »
export function normaliser(texte) {
  return String(texte ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Mots utiles d'une recherche tapée par un visiteur.
export function motsCles(recherche) {
  return normaliser(recherche)
    .split(" ")
    .filter((mot) => mot && !MOTS_VIDES.has(mot));
}

// Vrai si TOUS les mots-clés apparaissent quelque part dans les textes donnés
// (un mot peut être le début ou le milieu d'un mot : « carburant » trouve
// « carburants »). Une recherche vide laisse tout passer.
export function correspond(mots, textes) {
  if (mots.length === 0) return true;
  const botte = ` ${textes.map(normaliser).join(" ")} `;
  return mots.every((mot) => botte.includes(mot));
}
