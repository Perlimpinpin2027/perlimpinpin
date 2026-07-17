// Les 11 thèmes éditoriaux du site (nom + description reprise de /themes,
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
];

export function getThemeBySlug(slug) {
  return THEMES.find((theme) => theme.slug === slug) ?? null;
}
