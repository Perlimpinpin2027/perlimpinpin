// Les 12 thèmes éditoriaux du site (nom + description reprise de /themes,
// dont le contenu ne doit pas être modifié). Source partagée pour l'en-tête
// de /themes/[slug].
export const THEMES = [
  {
    slug: "logement",
    name: "Logement",
    description:
      "Construction, logement social, encadrement des loyers, rénovation énergétique, crédit immobilier.",
  },
  {
    slug: "economie",
    name: "Perspectives économiques, pouvoir d'achat, inflation & fiscalité",
    // Libellé court pour les pastilles et les cartes (même libellé que les
    // dossiers de /live et les filtres de /relectures).
    shortName: "Économie & pouvoir d'achat",
    description:
      "Budget de l'État, déficit public, pouvoir d'achat, TVA, fiscalité des entreprises.",
  },
  {
    slug: "ia-numerique",
    name: "IA & Numérique",
    description:
      "Régulation de l'IA, protection des données, cybersécurité, souveraineté numérique.",
  },
  {
    slug: "education",
    name: "Éducation nationale",
    description:
      "Niveau des élèves, effectifs enseignants, pénurie de professeurs, laïcité, public/privé.",
  },
  {
    slug: "securite-justice",
    name: "Sécurité & Justice",
    description:
      "Délinquance, effectifs policiers, places de prison, indépendance de la justice, réponse pénale.",
  },
  {
    slug: "sante",
    name: "Santé & Hôpital",
    description:
      "Fermeture de lits, déserts médicaux, financement de l'hôpital, urgences, reste à charge.",
  },
  {
    slug: "retraites",
    name: "Retraites",
    description:
      "Équilibre financier, âge de départ, pauvreté des retraités, comparaisons européennes.",
  },
  {
    slug: "emploi",
    name: "Emploi & Chômage",
    description:
      "Taux de chômage, précarité, allocations chômage, réforme du plein emploi.",
  },
  {
    slug: "energie-climat",
    name: "Énergie & Climat",
    description:
      "Mix énergétique, nucléaire vs renouvelables, objectifs climatiques, réseau électrique européen.",
  },
  {
    slug: "alimentation-agriculture",
    name: "Alimentation & Agriculture",
    description: "Prix agricoles, souveraineté alimentaire, PAC, circuits courts.",
  },
  {
    slug: "immigration",
    name: "Immigration",
    description:
      "Démographie, immigration irrégulière, droit d'asile, OQTF, flux légaux.",
  },
  {
    slug: "democratie-et-institutions",
    name: "Démocratie et institutions",
    description:
      "Mode de scrutin, statut et immunité des élus, financement de la vie politique, référendum, séparation des pouvoirs, transparence de la vie publique.",
  },
];

export function getThemeBySlug(slug) {
  return THEMES.find((theme) => theme.slug === slug) ?? null;
}

export const THEME_SLUGS = THEMES.map((theme) => theme.slug);

// ---------------------------------------------------------------------------
// Harmonisation des thèmes (octobre 2026)
//
// Le champ Proposition.theme stocke désormais le SLUG d'un des 12 thèmes
// ci-dessus (ex : "emploi"), jamais un texte libre. Les anciennes fiches ont
// été saisies à la main ("emploi", "Emploi et chômage", "economie"...) :
// resolveTheme() ramène n'importe laquelle de ces écritures au bon slug, et
// themeLabel() donne le libellé à afficher. Tout l'affichage du site passe
// par ces deux fonctions, ce qui le rend correct avant comme après la
// migration des données (scripts/harmoniser-themes.js).
// ---------------------------------------------------------------------------

// Met un texte sous une forme comparable : minuscules, sans accents,
// "&" lu comme "et", tout le reste en tirets.
// "Emploi & Chômage" -> "emploi-et-chomage"
export function normaliserTheme(texte) {
  return String(texte)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " et ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Anciennes saisies libres qui ne correspondent ni au slug ni au nom d'un
// thème. Clé = texte normalisé (voir normaliserTheme), valeur = slug.
// Choix éditoriaux : à compléter si scripts/harmoniser-themes.js signale
// une valeur inconnue.
const ALIAS_THEMES = {
  "dette-et-finances-publiques": "economie",
  "fiscalite-et-pouvoir-d-achat": "economie",
  "salaires": "economie",
  "fonction-publique": "economie",
  "travail-et-salaires": "emploi",
  "immigration-et-priorite-nationale": "immigration",
  "immigration-et-cohesion-nationale": "immigration",
  "europe-et-commerce-international": "democratie-et-institutions",
};

const INDEX_THEMES = new Map();
for (const theme of THEMES) {
  for (const ecriture of [theme.slug, theme.name, theme.shortName]) {
    if (ecriture) INDEX_THEMES.set(normaliserTheme(ecriture), theme.slug);
  }
}
for (const [alias, slug] of Object.entries(ALIAS_THEMES)) {
  INDEX_THEMES.set(alias, slug);
}

// Slug officiel correspondant à une écriture quelconque du thème, ou null si
// elle n'est pas reconnue.
export function resolveTheme(valeur) {
  if (!valeur) return null;
  return INDEX_THEMES.get(normaliserTheme(valeur)) ?? null;
}

// Libellé d'affichage (court si disponible). Une valeur non reconnue est
// affichée telle quelle plutôt que masquée.
export function themeLabel(valeur) {
  const theme = getThemeBySlug(resolveTheme(valeur));
  return theme ? (theme.shortName ?? theme.name) : valeur;
}
