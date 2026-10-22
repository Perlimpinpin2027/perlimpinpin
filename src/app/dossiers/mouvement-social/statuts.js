// Couleur de chaque étiquette de statut des propositions (champ `statut`
// d'une proposition = `id` d'un élément de `statuts.items` du JSON). Couleurs
// choisies hors de celles des verdicts (rouge, orange, ambre, vert), pour
// qu'une étiquette ne se lise pas comme une note. Classes Tailwind écrites en
// entier, pour que Tailwind les repère dans ce fichier.
export const COULEURS_STATUT = {
  nouvelle: "bg-blue-100 text-blue-900",
  "mouvement-lyceen": "bg-violet-100 text-violet-800",
  reaffirmee: "bg-cyan-100 text-cyan-900",
  anterieure: "bg-zinc-200 text-zinc-700",
};

// Statut inconnu (faute de frappe dans le JSON) : gris neutre.
export function couleurStatut(id) {
  return COULEURS_STATUT[id] ?? "bg-zinc-100 text-zinc-500";
}
