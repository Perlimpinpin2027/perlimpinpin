// Le modèle renvoie parfois des citations sous forme de balises
// <cite index="X-Y">texte</cite> issues du tool web_search. On les
// supprime en ne gardant que le texte qu'elles encadrent.
export function stripCiteTags(text) {
  if (typeof text !== "string") return text;
  return text.replace(/<cite[^>]*>([\s\S]*?)<\/cite>/g, "$1");
}

// Filet de sécurité stylistique : malgré la consigne du prompt, le modèle
// utilise parfois un tiret d'interruption (—, –, ou un "-" isolé entre
// espaces) pour marquer une pause/opposition ("coûteuse — et sans garantie").
// On ne touche jamais aux traits d'union sans espaces autour (mots composés,
// "Jean-Luc", plages numériques "8-32") : seul un tiret entouré d'espaces
// des deux côtés est visé. Remplacement simple par une virgule.
export function stripInterruptionDashes(text) {
  if (typeof text !== "string") return text;
  return text.replace(/\s+[—–-]\s+/g, ", ");
}

// Applique les nettoyages ci-dessus récursivement sur toutes les chaînes
// d'une structure JSON (contenuComplet), quelle que soit sa profondeur.
export function cleanContenu(value) {
  if (typeof value === "string") {
    return stripInterruptionDashes(stripCiteTags(value));
  }
  if (Array.isArray(value)) return value.map(cleanContenu);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [key, cleanContenu(val)]),
    );
  }
  return value;
}
