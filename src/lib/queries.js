import { prisma } from "@/lib/prisma";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

// Titre court pour l'affichage sur les cartes. Si `titre` n'a pas été
// généré (anciennes propositions), on retombe sur texteOriginal tronqué.
function displayTitle(proposition) {
  if (proposition.titre) return proposition.titre;
  const text = proposition.texteOriginal;
  return text.length > 80 ? `${text.slice(0, 79).trimEnd()}…` : text;
}

// Toutes les analyses publiées, des plus récentes aux plus anciennes, pour
// le carrousel "Prix Perlimpinpin de la semaine" + la carte Score associée.
export async function getFeaturedRotation() {
  const analyses = await prisma.analyse.findMany({
    where: { statut: "publie" },
    orderBy: { createdAt: "desc" },
    include: {
      proposition: { include: { candidat: true } },
    },
  });

  return analyses.map((analyse) => ({
    propositionId: analyse.proposition.id,
    quoteText: displayTitle(analyse.proposition),
    personName: analyse.proposition.candidat.nom,
    personRole: `Déclaration • ${analyse.proposition.theme}`,
    dateLabel: dateFormatter.format(analyse.proposition.dateDeclaration),
    score: analyse.scoreFaisabilite,
    verdictDescription: analyse.verdict,
  }));
}

export async function getTopDeclarations(limit = 3) {
  const analyses = await prisma.analyse.findMany({
    where: { statut: "publie" },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      proposition: { include: { candidat: true } },
    },
  });

  return analyses.map((analyse) => ({
    propositionId: analyse.proposition.id,
    name: analyse.proposition.candidat.nom,
    quote: displayTitle(analyse.proposition),
    date: dateFormatter.format(analyse.proposition.dateDeclaration),
    theme: analyse.proposition.theme,
    score: analyse.scoreFaisabilite,
  }));
}

export async function getCandidateRanking(limit = 7) {
  const candidats = await prisma.candidat.findMany({
    take: limit,
    orderBy: [{ scoreMoyen: { sort: "desc", nulls: "last" } }, { nom: "asc" }],
    include: {
      propositions: {
        include: { analyses: true },
      },
    },
  });

  return candidats.map((candidat) => ({
    name: candidat.nom,
    avgScore: candidat.scoreMoyen,
    declarations: candidat.propositions.reduce(
      (total, proposition) => total + proposition.analyses.length,
      0,
    ),
  }));
}

// Liste des déclarations publiées pour la page /declarations, avec filtres
// (candidat, thème) et tri (date ou score). Retourne aussi les listes de
// candidats/thèmes disponibles pour construire les filtres.
export async function getPublishedDeclarations({ candidat, theme, sort } = {}) {
  const orderBy =
    sort === "score_asc"
      ? [{ scoreFaisabilite: "asc" }]
      : sort === "score_desc"
        ? [{ scoreFaisabilite: "desc" }]
        : [{ createdAt: "desc" }];

  const [analyses, allPublished] = await Promise.all([
    prisma.analyse.findMany({
      where: {
        statut: "publie",
        ...(candidat ? { proposition: { candidat: { nom: candidat } } } : {}),
        ...(theme ? { proposition: { theme } } : {}),
      },
      orderBy,
      include: {
        proposition: { include: { candidat: true } },
      },
    }),
    prisma.analyse.findMany({
      where: { statut: "publie" },
      include: { proposition: { include: { candidat: true } } },
    }),
  ]);

  const candidats = [
    ...new Map(
      allPublished.map((a) => [
        a.proposition.candidat.nom,
        { nom: a.proposition.candidat.nom, parti: a.proposition.candidat.parti },
      ]),
    ).values(),
  ].sort((a, b) => a.nom.localeCompare(b.nom, "fr"));

  const themes = [...new Set(allPublished.map((a) => a.proposition.theme))].sort(
    (a, b) => a.localeCompare(b, "fr"),
  );

  const declarations = analyses.map((analyse) => ({
    id: analyse.proposition.id,
    titre: displayTitle(analyse.proposition),
    candidatNom: analyse.proposition.candidat.nom,
    candidatParti: analyse.proposition.candidat.parti,
    theme: analyse.proposition.theme,
    dateLabel: dateFormatter.format(analyse.proposition.dateDeclaration),
    score: analyse.scoreFaisabilite,
  }));

  return { declarations, candidats, themes };
}

// Thèmes distincts utilisés par les analyses publiées, pour les tags
// cliquables du Hero de la page d'accueil.
export async function getPublishedThemes() {
  const analyses = await prisma.analyse.findMany({
    where: { statut: "publie" },
    select: { proposition: { select: { theme: true } } },
  });

  return [...new Set(analyses.map((a) => a.proposition.theme))].sort((a, b) =>
    a.localeCompare(b, "fr"),
  );
}

// Liste de tous les candidats pour la page /candidats, avec leur nombre de
// déclarations publiées et leur score moyen.
export async function getAllCandidats() {
  const candidats = await prisma.candidat.findMany({
    orderBy: [{ scoreMoyen: { sort: "desc", nulls: "last" } }, { nom: "asc" }],
    include: {
      propositions: {
        include: { analyses: { where: { statut: "publie" } } },
      },
    },
  });

  return candidats.map((candidat) => ({
    id: candidat.id,
    nom: candidat.nom,
    parti: candidat.parti,
    photoUrl: candidat.photoUrl,
    scoreMoyen: candidat.scoreMoyen,
    declarationsPubliees: candidat.propositions.reduce(
      (total, proposition) => total + proposition.analyses.length,
      0,
    ),
  }));
}

// Détail d'un candidat pour sa fiche /candidats/[id].
export async function getCandidatDetail(id) {
  const candidat = await prisma.candidat.findUnique({ where: { id } });

  if (!candidat) return null;

  return {
    id: candidat.id,
    nom: candidat.nom,
    parti: candidat.parti,
    photoUrl: candidat.photoUrl,
    scoreMoyen: candidat.scoreMoyen,
  };
}

// Détail d'une déclaration : la Proposition, son Candidat, et sa dernière
// Analyse (avec le contenuComplet JSON pour les 17 sections).
export async function getDeclarationDetail(propositionId) {
  const proposition = await prisma.proposition.findUnique({
    where: { id: propositionId },
    include: {
      candidat: true,
      analyses: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  if (!proposition) return null;

  const analyse = proposition.analyses[0] ?? null;

  return {
    id: proposition.id,
    titre: displayTitle(proposition),
    texteOriginal: proposition.texteOriginal,
    theme: proposition.theme,
    dateLabel: dateFormatter.format(proposition.dateDeclaration),
    candidat: proposition.candidat,
    analyse,
  };
}
