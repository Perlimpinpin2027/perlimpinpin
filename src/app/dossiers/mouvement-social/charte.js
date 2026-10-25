import localFont from "next/font/local";

// Charte propre au dossier « Mouvement social » (`charte` du JSON) : police
// Inter, noir, gris et jaune adouci. Elle ne s'applique qu'à cette page et ne
// change rien au reste du site.

// Inter hébergée dans le dépôt (src/app/fonts/, licence SIL OFL à côté), comme
// les autres polices du site : pas de next/font/google, pour que le build ne
// dépende d'aucun service extérieur (voir src/app/layout.js). Source : paquet
// npm @fontsource-variable/inter 5.2.8 (police variable, sous-ensemble latin).
export const inter = localFont({
  src: "../../fonts/inter-latin-wght-normal.woff2",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
});

// Couleurs de `charte.couleurs` exposées en variables CSS sur la racine de la
// page (--ms-noir, --ms-jaune…), utilisées par les classes `bg-(--ms-…)`.
// Les valeurs restent dans le JSON ; seuls les noms sont dans le code.
export function variablesCharte(couleurs = {}) {
  return Object.fromEntries(Object.entries(couleurs).map(([nom, valeur]) => [`--ms-${nom}`, valeur]));
}
