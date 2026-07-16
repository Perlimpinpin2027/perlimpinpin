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
    personPhotoUrl: analyse.proposition.candidat.photoUrl,
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
    photoUrl: analyse.proposition.candidat.photoUrl,
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
    photoUrl: candidat.photoUrl,
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
    candidatPhotoUrl: analyse.proposition.candidat.photoUrl,
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

// Compte les votes like/dislike par Analyse, filtré depuis `sinceDate`
// (ou sur toute la période si `sinceDate` est omis).
async function getVoteCountsByAnalyse(sinceDate) {
  const rows = await prisma.feedback.groupBy({
    by: ["analyseId", "type"],
    where: sinceDate ? { createdAt: { gte: sinceDate } } : undefined,
    _count: { _all: true },
  });

  const counts = new Map();
  for (const row of rows) {
    const entry = counts.get(row.analyseId) ?? { likes: 0, dislikes: 0 };
    if (row.type === "like") entry.likes = row._count._all;
    if (row.type === "dislike") entry.dislikes = row._count._all;
    counts.set(row.analyseId, entry);
  }
  return counts;
}

// Renvoie l'analyseId ayant le plus de votes pour `key` ("likes"/"dislikes"),
// ou null si aucune analyse n'a de vote sur cette période.
function pickTopVoted(counts, key) {
  let bestId = null;
  let bestCount = 0;
  for (const [analyseId, entry] of counts) {
    if (entry[key] > bestCount) {
      bestCount = entry[key];
      bestId = analyseId;
    }
  }
  return bestId;
}

// Carte commune (candidat, titre, extrait, score) partagée par le
// classement par votes et le classement par score de /prix-perlimpinpin.
function buildAnalyseCard(analyse) {
  const contenu = analyse.contenuComplet ?? {};
  const excerptSource = contenu.verdict_final ?? contenu.resume_court ?? analyse.verdict;
  const excerptText = Array.isArray(excerptSource)
    ? excerptSource.join(" ")
    : (excerptSource ?? "");
  const excerpt =
    excerptText.length > 150 ? `${excerptText.slice(0, 149).trimEnd()}…` : excerptText;

  return {
    propositionId: analyse.proposition.id,
    titre: displayTitle(analyse.proposition),
    candidatNom: analyse.proposition.candidat.nom,
    candidatPhotoUrl: analyse.proposition.candidat.photoUrl,
    excerpt,
    score: analyse.scoreFaisabilite,
  };
}

async function buildLeaderboardCard(analyseId, counts) {
  if (!analyseId) return null;

  const analyse = await prisma.analyse.findUnique({
    where: { id: analyseId },
    include: { proposition: { include: { candidat: true } } },
  });
  if (!analyse) return null;

  const { likes, dislikes } = counts.get(analyseId) ?? { likes: 0, dislikes: 0 };

  return { ...buildAnalyseCard(analyse), likes, dislikes };
}

async function buildLeaderboardSection(counts) {
  const [topLiked, topDisliked] = await Promise.all([
    buildLeaderboardCard(pickTopVoted(counts, "likes"), counts),
    buildLeaderboardCard(pickTopVoted(counts, "dislikes"), counts),
  ]);
  return { topLiked, topDisliked };
}

// Classement des déclarations par votes pour la page /prix-perlimpinpin :
// général (toutes périodes), 30 derniers jours, 10 derniers jours.
export async function getFeedbackLeaderboard() {
  const now = Date.now();
  const since30 = new Date(now - 30 * 24 * 60 * 60 * 1000);
  const since10 = new Date(now - 10 * 24 * 60 * 60 * 1000);

  const [allCounts, counts30, counts10] = await Promise.all([
    getVoteCountsByAnalyse(),
    getVoteCountsByAnalyse(since30),
    getVoteCountsByAnalyse(since10),
  ]);

  const [general, last30, last10] = await Promise.all([
    buildLeaderboardSection(allCounts),
    buildLeaderboardSection(counts30),
    buildLeaderboardSection(counts10),
  ]);

  return { general, last30, last10 };
}

// Déclarations avec le score Perlimpinpin le plus haut et le plus bas parmi
// toutes les analyses publiées, pour le podium en haut de /prix-perlimpinpin.
export async function getScoreExtremes() {
  const [highest, lowest] = await Promise.all([
    prisma.analyse.findFirst({
      where: { statut: "publie" },
      orderBy: [{ scoreFaisabilite: "desc" }, { createdAt: "asc" }],
      include: { proposition: { include: { candidat: true } } },
    }),
    prisma.analyse.findFirst({
      where: { statut: "publie" },
      orderBy: [{ scoreFaisabilite: "asc" }, { createdAt: "asc" }],
      include: { proposition: { include: { candidat: true } } },
    }),
  ]);

  return {
    highest: highest ? buildAnalyseCard(highest) : null,
    // Si une seule analyse publiée existe, highest et lowest seraient la
    // même déclaration affichée deux fois — on n'affiche alors qu'une carte.
    lowest:
      lowest && lowest.id !== highest?.id ? buildAnalyseCard(lowest) : null,
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

  const feedbackCounts = analyse
    ? await (async () => {
        const [likes, dislikes] = await Promise.all([
          prisma.feedback.count({
            where: { analyseId: analyse.id, type: "like" },
          }),
          prisma.feedback.count({
            where: { analyseId: analyse.id, type: "dislike" },
          }),
        ]);
        return { likes, dislikes };
      })()
    : { likes: 0, dislikes: 0 };

  return {
    id: proposition.id,
    titre: displayTitle(proposition),
    texteOriginal: proposition.texteOriginal,
    theme: proposition.theme,
    dateLabel: dateFormatter.format(proposition.dateDeclaration),
    candidat: proposition.candidat,
    analyse,
    feedbackCounts,
  };
}
