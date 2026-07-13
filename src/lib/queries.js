import { prisma } from "@/lib/prisma";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

// Seuils alignés sur la légende "Comment fonctionne le score ?"
// (70-100 Plutôt fondé / 40-69 Partiellement fondé / 0-39 Non étayé).
function scoreToFlag(score) {
  return score >= 70 ? "green" : "red";
}

function scoreToVerdictLabel(score) {
  if (score >= 70) return "Plutôt fondé";
  if (score >= 40) return "Partiellement fondé";
  return "Non étayé";
}

export async function getFeaturedAnalysis() {
  const analyse = await prisma.analyse.findFirst({
    where: { statut: "publie" },
    orderBy: { createdAt: "desc" },
    include: {
      proposition: { include: { candidat: true } },
    },
  });

  if (!analyse) return null;

  const flagColor = scoreToFlag(analyse.scoreFaisabilite);

  return {
    quoteText: analyse.proposition.texteOriginal,
    personName: analyse.proposition.candidat.nom,
    personRole: `Déclaration • ${analyse.proposition.theme}`,
    dateLabel: dateFormatter.format(analyse.proposition.dateDeclaration),
    score: analyse.scoreFaisabilite,
    flagColor,
    flagLabel: flagColor === "green" ? "Green Flag" : "Red Flag",
    verdictLabel: scoreToVerdictLabel(analyse.scoreFaisabilite),
    verdictDescription: analyse.verdict,
  };
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
    name: analyse.proposition.candidat.nom,
    quote: analyse.proposition.texteOriginal,
    date: dateFormatter.format(analyse.proposition.dateDeclaration),
    theme: analyse.proposition.theme,
    score: analyse.scoreFaisabilite,
    flag: scoreToFlag(analyse.scoreFaisabilite),
  }));
}

export async function getCandidateRanking(limit = 7) {
  const candidats = await prisma.candidat.findMany({
    take: limit,
    orderBy: [{ scoreMoyen: "desc" }, { nom: "asc" }],
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
