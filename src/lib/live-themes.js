import { THEMES } from "./themes.js";

// Dossiers de /live : les 12 thèmes éditoriaux du site (src/lib/themes.js,
// même slugs que /themes/[slug]) + "autre". Le slug est ce qui est stocké
// en base (LiveAnalyse.theme) ; le libellé sert à l'affichage.

// Le nom éditorial du thème « economie » est une longue liste : libellé court
// pour les dossiers.
const SHORT_LABELS = { economie: "Économie & pouvoir d'achat" };

export const LIVE_THEMES = [
  ...THEMES.map((theme) => ({
    slug: theme.slug,
    label: SHORT_LABELS[theme.slug] ?? theme.name,
    description: theme.description,
  })),
  { slug: "autre", label: "Autre", description: "Sujet ne relevant d'aucun des thèmes ci-dessus." },
];

export const LIVE_THEME_SLUGS = LIVE_THEMES.map((theme) => theme.slug);

export function liveThemeLabel(slug) {
  return LIVE_THEMES.find((theme) => theme.slug === slug)?.label ?? "Autre";
}
