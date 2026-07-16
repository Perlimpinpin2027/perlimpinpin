// Le modèle renvoie parfois des citations sous forme de balises
// <cite index="X-Y">texte</cite> issues du tool web_search. On les
// supprime en ne gardant que le texte qu'elles encadrent.
export function stripCiteTags(text) {
  if (typeof text !== "string") return text;
  return text.replace(/<cite[^>]*>([\s\S]*?)<\/cite>/g, "$1");
}

// Applique stripCiteTags récursivement sur toutes les chaînes d'une
// structure JSON (contenuComplet), quelle que soit sa profondeur.
export function cleanContenu(value) {
  if (typeof value === "string") return stripCiteTags(value);
  if (Array.isArray(value)) return value.map(cleanContenu);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [key, cleanContenu(val)]),
    );
  }
  return value;
}
