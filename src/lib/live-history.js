import { prisma } from "@/lib/prisma";

// Persistance et lecture des analyses lancées depuis /live (table
// LiveAnalyse). Distinct du pipeline public (Proposition/Analyse) : rien
// ici n'est jamais publié.

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const TITRE_MAX_LENGTH = 120;

function shorten(text, max) {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

// Enregistre une analyse produite par analyseDeclaration(). Ne sauvegarde
// rien si aucune mesure n'a été analysée (rien à afficher dans
// l'historique). Ne lève jamais : un échec de sauvegarde ne doit pas
// empêcher l'équipe de voir l'analyse déjà produite.
export async function saveLiveAnalyse({ declaration, resultat, candidatId }) {
  try {
    const { mesures } = resultat;
    if (mesures.length === 0) return null;

    const scores = mesures.map((mesure) => mesure.notation_detaillee.score_total);
    const score = Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length);

    return await prisma.liveAnalyse.create({
      data: {
        declaration,
        titre: shorten(mesures[0].mesure_reformulee, TITRE_MAX_LENGTH),
        score,
        nbMesures: mesures.length,
        resultat,
        candidatId: candidatId ?? null,
      },
      select: { id: true },
    });
  } catch (error) {
    console.error("[live] sauvegarde de l'analyse impossible :", error);
    return null;
  }
}

// Dernières analyses live, les plus récentes en premier.
export async function getRecentLiveAnalyses(limit) {
  const rows = await prisma.liveAnalyse.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      titre: true,
      score: true,
      nbMesures: true,
      createdAt: true,
      candidat: { select: { nom: true, photoUrl: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    titre: row.titre,
    score: row.score,
    nbMesures: row.nbMesures,
    dateLabel: dateFormatter.format(row.createdAt),
    candidatNom: row.candidat?.nom ?? null,
    candidatPhotoUrl: row.candidat?.photoUrl ?? null,
  }));
}

// Candidats proposés dans le sélecteur facultatif du formulaire.
export async function getCandidatsForSelect() {
  return prisma.candidat.findMany({
    select: { id: true, nom: true },
    orderBy: { nom: "asc" },
  });
}
