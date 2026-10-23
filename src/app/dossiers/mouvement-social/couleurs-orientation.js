// Couleur des ronds du triangle selon l'orientation des mesures du levier 3
// (`couleur` calculée par src/lib/releve-securite.js). Teintes neutres, sans
// lien avec un parti. L'orange (#ea580c) est nettement plus sombre que le
// vert d'eau (#5eead4) : rapport de luminance de 2,4, ils restent
// distincts pour un daltonien. Le rond « aucune » a un liseré pour se
// détacher du fond. Classes Tailwind écrites en entier, pour que Tailwind
// les repère dans ce fichier.
export const COULEURS_ORIENTATION = {
  capacites: "bg-[#ea580c]",
  encadrement: "bg-[#5eead4]",
  mixte: "bg-[#3f3f46]",
  aucune: "bg-[#e4e4e7] ring-1 ring-inset ring-zinc-400",
};
