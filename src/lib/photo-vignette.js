import VIGNETTES from "./photo-vignettes.json" with { type: "json" };

// Vignette 128×160 d'une photo de candidat, pour les listes (photos affichées
// en 36 à 64 px). Générée par scripts/vignettes-photos.js (npm run vignettes).
// Seules les photos de public/photos/ listées dans photo-vignettes.json ont une
// vignette : pour toute autre adresse (photo externe, nouveau candidat pas
// encore traité, placeholder), on renvoie l'adresse d'origine telle quelle.
// Ne pas utiliser pour les grands formats (carrousel, page candidat).
export function vignettePhoto(url, disponibles = VIGNETTES) {
  const match = typeof url === "string" ? url.match(/^\/photos\/([^/]+)\.[a-z]+$/i) : null;
  if (!match || !disponibles.includes(url.slice("/photos/".length))) return url;
  return `/photos/vignettes/${match[1]}.webp`;
}
