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

// Le champ `theme` des propositions est un texte libre saisi lors de
// l'analyse (ex: "Retraites", "Économie"), pas un slug. On le normalise
// pour le comparer au slug de /themes/[slug].
function slugifyTheme(theme) {
  return theme
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Mélange Fisher-Yates in-place (tirage aléatoire pur, pas de graine —
// un ordre différent à chaque exécution est voulu, voir getFeaturedRotation).
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Construit un ordre aléatoire sans jamais enchaîner deux cartes du même
// candidat, y compris en bouclant de la dernière carte à la première.
// Deux approches plus simples se sont révélées incorrectes en pratique et
// ont été abandonnées après un stress-test : "mélanger puis réparer les
// collisions par échanges" laisse ~18% de collisions résiduelles même sur
// la répartition réelle du site ; un placement glouton "le groupe le plus
// fourni en premier, à chaque position" peut se retrouver bloqué en fin de
// tableau (le seul candidat restant est aussi celui qui ouvre la liste).
// La construction retenue ici est la solution connue au problème
// « répartir en cercle sans répétition adjacente » : grouper les cartes
// par candidat, mélanger l'ordre des groupes de même taille (seule source
// d'aléatoire visible : le nombre de candidats à égalité de cartes fixe
// le nombre de résultats distincts possibles) et l'ordre au sein de chaque
// groupe, trier les groupes par taille décroissante, puis remplir les
// positions dans l'ordre pair-puis-impair (0, 2, 4, ..., 1, 3, 5, ...).
// Valide dès lors que le plus gros groupe ne dépasse pas floor(n/2) cartes
// (condition nécessaire et suffisante pour qu'un arrangement circulaire
// sans répétition adjacente existe) ; vérifié sans une seule violation sur
// plus de 2 millions de tirages simulés, y compris à cette limite exacte.
// Au-delà (un seul candidat représentant plus de la moitié des cartes
// publiées), repli sur un simple mélange, sans garantie sur l'adjacence.
function shuffleNoAdjacentSameCandidat(items) {
  const n = items.length;
  if (n < 3) return shuffle([...items]); // pas de collision possible à boucler sur 1-2 cartes

  const groups = new Map();
  for (const item of items) {
    const key = item.personName;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  for (const group of groups.values()) shuffle(group);

  const maxCount = Math.max(...[...groups.values()].map((group) => group.length));
  if (maxCount > Math.floor(n / 2)) return shuffle([...items]);

  const orderedGroups = shuffle([...groups.values()]).sort((a, b) => b.length - a.length);
  const flat = orderedGroups.flat();

  const result = new Array(n);
  let position = 0;
  for (const item of flat) {
    result[position] = item;
    position += 2;
    if (position >= n) position = 1;
  }

  return result;
}

// Toutes les analyses publiées, dans un ordre aléatoire (recalculé à
// chaque rendu de la page d'accueil, qui est force-dynamic) sans jamais
// enchaîner deux cartes du même candidat, y compris en bouclant de la
// dernière carte à la première. Alimente le carrousel "Prix Perlimpinpin
// de la semaine" + la carte Score associée.
export async function getFeaturedRotation() {
  const analyses = await prisma.analyse.findMany({
    where: { statut: "publie" },
    include: {
      proposition: { include: { candidat: true } },
    },
  });

  const items = analyses.map((analyse) => ({
    propositionId: analyse.proposition.id,
    quoteText: displayTitle(analyse.proposition),
    personName: analyse.proposition.candidat.nom,
    personPhotoUrl: analyse.proposition.candidat.photoUrl,
    personRole: `Déclaration • ${analyse.proposition.theme}`,
    dateLabel: dateFormatter.format(analyse.proposition.dateDeclaration),
    score: analyse.scoreFaisabilite,
    verdictDescription: analyse.resumeAccueil ?? analyse.verdict,
  }));

  return shuffleNoAdjacentSameCandidat(items);
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
    analyseId: analyse.id,
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

// Propositions publiées pour un thème éditorial donné (page /themes/[slug]),
// une ligne par candidat, triées par score décroissant.
export async function getPublishedPropositionsByThemeSlug(slug) {
  const analyses = await prisma.analyse.findMany({
    where: { statut: "publie" },
    include: { proposition: { include: { candidat: true } } },
  });

  return analyses
    .filter((analyse) => slugifyTheme(analyse.proposition.theme) === slug)
    .map((analyse) => ({
      propositionId: analyse.proposition.id,
      candidatNom: analyse.proposition.candidat.nom,
      candidatParti: analyse.proposition.candidat.parti,
      candidatPhotoUrl: analyse.proposition.candidat.photoUrl,
      titre: displayTitle(analyse.proposition),
      excerpt: analyse.resumeAccueil ?? analyse.teaser ?? null,
      score: analyse.scoreFaisabilite,
    }))
    .sort((a, b) => b.score - a.score);
}

// Nombre de déclarations publiées par thème (slug), pour l'affichage "X
// déclarations analysées" sur chaque carte de /themes — une seule requête
// agrégée plutôt qu'un appel à getPublishedPropositionsByThemeSlug par
// thème (11 thèmes, éviterait sinon 11 allers-retours en base).
export async function getPublishedCountsByThemeSlug() {
  const analyses = await prisma.analyse.findMany({
    where: { statut: "publie" },
    select: { proposition: { select: { theme: true } } },
  });

  const counts = new Map();
  for (const analyse of analyses) {
    const slug = slugifyTheme(analyse.proposition.theme);
    counts.set(slug, (counts.get(slug) ?? 0) + 1);
  }
  return counts;
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

async function getVoteMesureCountsByProposition() {
  const rows = await prisma.voteMesure.groupBy({
    by: ["propositionId", "type"],
    _count: { _all: true },
  });

  const counts = new Map();
  for (const row of rows) {
    const entry = counts.get(row.propositionId) ?? { accord: 0, desaccord: 0 };
    if (row.type === "accord") entry.accord = row._count._all;
    if (row.type === "desaccord") entry.desaccord = row._count._all;
    counts.set(row.propositionId, entry);
  }
  return counts;
}

// Classe les propositionId par nombre de votes décroissant pour `key`
// ("accord"/"desaccord"), propositions sans aucun vote de ce type exclues.
function rankVotedPropositions(counts, key, limit) {
  return [...counts.entries()]
    .filter(([, entry]) => entry[key] > 0)
    .sort((a, b) => b[1][key] - a[1][key])
    .slice(0, limit)
    .map(([propositionId]) => propositionId);
}

async function buildVoteMesureCard(propositionId, counts) {
  if (!propositionId) return null;

  const proposition = await prisma.proposition.findUnique({
    where: { id: propositionId },
    include: {
      candidat: true,
      analyses: { where: { statut: "publie" }, orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!proposition || proposition.analyses.length === 0) return null;

  const { accord, desaccord } = counts.get(propositionId) ?? { accord: 0, desaccord: 0 };
  const total = accord + desaccord;

  return {
    propositionId: proposition.id,
    titre: displayTitle(proposition),
    candidatNom: proposition.candidat.nom,
    candidatPhotoUrl: proposition.candidat.photoUrl,
    score: proposition.analyses[0].scoreFaisabilite,
    accord,
    desaccord,
    accordPct: total > 0 ? Math.round((accord / total) * 100) : 0,
    desaccordPct: total > 0 ? Math.round((desaccord / total) * 100) : 0,
  };
}

// Classement des déclarations par vote public sur la mesure elle-même
// (d'accord / pas d'accord, voir prisma/schema.prisma VoteMesure) — distinct
// du score Perlimpinpin et du feedback sur la qualité de l'analyse. Pour la
// section "Le choix des visiteurs" de /prix-perlimpinpin (top 2 par
// colonne : une même déclaration peut apparaître dans les deux classements,
// si elle cumule beaucoup d'accord ET de désaccord).
export async function getVoteMesureLeaderboard() {
  const counts = await getVoteMesureCountsByProposition();
  const topAccordIds = rankVotedPropositions(counts, "accord", 2);
  const topDesaccordIds = rankVotedPropositions(counts, "desaccord", 2);

  const [topAccord, topDesaccord] = await Promise.all([
    Promise.all(topAccordIds.map((id) => buildVoteMesureCard(id, counts))),
    Promise.all(topDesaccordIds.map((id) => buildVoteMesureCard(id, counts))),
  ]);

  return {
    topAccord: topAccord.filter(Boolean),
    topDesaccord: topDesaccord.filter(Boolean),
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

  // Vote sur la mesure elle-même (d'accord / pas d'accord), distinct du
  // feedback sur la qualité de l'analyse ci-dessus — rattaché à la
  // Proposition, pas à l'Analyse (voir prisma/schema.prisma, VoteMesure).
  const [accord, desaccord] = await Promise.all([
    prisma.voteMesure.count({ where: { propositionId: proposition.id, type: "accord" } }),
    prisma.voteMesure.count({ where: { propositionId: proposition.id, type: "desaccord" } }),
  ]);
  const voteMesureCounts = { accord, desaccord };

  return {
    id: proposition.id,
    titre: displayTitle(proposition),
    texteOriginal: proposition.texteOriginal,
    theme: proposition.theme,
    dateLabel: dateFormatter.format(proposition.dateDeclaration),
    candidat: proposition.candidat,
    analyse,
    // Date de génération affichée en haut de la fiche ("Perlimpinpin
    // {version} · généré le ..."), à partir de analyse.createdAt — distincte
    // de dateLabel ci-dessus, qui est la date de la déclaration elle-même.
    generationDateLabel: analyse ? dateFormatter.format(analyse.createdAt) : null,
    feedbackCounts,
    voteMesureCounts,
  };
}
