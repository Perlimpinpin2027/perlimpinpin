// Couleur de chaque étiquette de statut des propositions (champ `statut`
// d'une proposition = `id` d'un élément de `statuts.items` du JSON), dans la
// charte du dossier (noir, gris, jaune ; variables CSS --ms-…, voir
// charte.js). Classes Tailwind écrites en entier, pour que Tailwind les
// repère dans ce fichier.
export const COULEURS_STATUT = {
  nouvelle: "bg-(--ms-jaune) text-(--ms-noir)",
  "mouvement-lyceen": "bg-(--ms-noir) text-white",
  reaffirmee: "bg-(--ms-gris200) text-(--ms-gris900)",
  anterieure: "border border-dashed border-(--ms-gris400) bg-white text-(--ms-gris600)",
};

// Statut inconnu (faute de frappe dans le JSON) : gris neutre.
export function couleurStatut(id) {
  return COULEURS_STATUT[id] ?? "bg-(--ms-gris50) text-(--ms-gris600)";
}
