import { prisma } from "@/lib/prisma";
import { LIVE_THEMES, LIVE_THEME_SLUGS, liveThemeLabel } from "@/lib/live-themes";

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
        theme: LIVE_THEME_SLUGS.includes(resultat.theme) ? resultat.theme : "autre",
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

// Champs lus pour afficher une analyse sous forme de carte (historique,
// analyses récentes, favoris, résultats de recherche).
const CARD_SELECT = {
  id: true,
  titre: true,
  score: true,
  nbMesures: true,
  theme: true,
  favori: true,
  createdAt: true,
  candidat: { select: { nom: true, photoUrl: true } },
};

function toCard(row) {
  return {
    id: row.id,
    titre: row.titre,
    score: row.score,
    nbMesures: row.nbMesures,
    themeSlug: row.theme,
    themeLabel: liveThemeLabel(row.theme),
    favori: row.favori,
    dateLabel: dateFormatter.format(row.createdAt),
    candidatNom: row.candidat?.nom ?? null,
    candidatPhotoUrl: row.candidat?.photoUrl ?? null,
  };
}

// Dernières analyses live, les plus récentes en premier. Filtres facultatifs :
// un dossier (slug de thème) ou les favoris seulement.
export async function getRecentLiveAnalyses(limit, { theme, favoris } = {}) {
  const rows = await prisma.liveAnalyse.findMany({
    where: {
      ...(theme ? { theme } : {}),
      ...(favoris ? { favori: true } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: CARD_SELECT,
  });
  return rows.map(toCard);
}

// --- Recherche ---------------------------------------------------------------

export const SEARCH_MIN_LENGTH = 2;
export const SEARCH_MAX_LENGTH = 100;
const SEARCH_LIMIT = 50;

// Minuscules sans accents : sert uniquement à retrouver les thèmes (le thème est
// stocké sous forme de slug, ex. "sante", alors qu'on tape "santé").
function foldAccents(text) {
  return text.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

// Prisma n'échappe pas les jokers SQL LIKE dans `contains` : sans cela, chercher
// « % » ou « _ » renverrait toutes les analyses. Le caractère d'échappement par
// défaut de PostgreSQL est l'antislash.
function escapeLike(text) {
  return text.replace(/[\\%_]/g, "\\$&");
}

// Recherche simple (aucune IA) dans les analyses live, insensible à la casse :
// nom du candidat, thème (dossier), texte de la déclaration analysée et titre
// de l'analyse. Retourne { query, total, analyses } — les SEARCH_LIMIT plus
// récentes, le total permettant d'indiquer s'il y en a davantage.
export async function searchLiveAnalyses(rawQuery) {
  const query = String(rawQuery ?? "").trim().slice(0, SEARCH_MAX_LENGTH);
  if (query.length < SEARCH_MIN_LENGTH) return { query: "", total: 0, analyses: [] };

  const pattern = escapeLike(query);
  const folded = foldAccents(query);
  const themeSlugs = LIVE_THEMES.filter(
    (theme) => foldAccents(theme.label).includes(folded) || theme.slug.includes(folded),
  ).map((theme) => theme.slug);

  const where = {
    OR: [
      { declaration: { contains: pattern, mode: "insensitive" } },
      { titre: { contains: pattern, mode: "insensitive" } },
      { candidat: { nom: { contains: pattern, mode: "insensitive" } } },
      ...(themeSlugs.length > 0 ? [{ theme: { in: themeSlugs } }] : []),
    ],
  };

  const [rows, total] = await Promise.all([
    prisma.liveAnalyse.findMany({ where, orderBy: { createdAt: "desc" }, take: SEARCH_LIMIT, select: CARD_SELECT }),
    prisma.liveAnalyse.count({ where }),
  ]);
  return { query, total, analyses: rows.map(toCard), limit: SEARCH_LIMIT };
}

// Candidats proposés dans le sélecteur facultatif du formulaire.
export async function getCandidatsForSelect() {
  return prisma.candidat.findMany({
    select: { id: true, nom: true },
    orderBy: { nom: "asc" },
  });
}

// Dossiers : regroupement automatique par thème, un par thème présent en
// base, du plus fourni au moins fourni.
export async function getLiveDossiers() {
  const groups = await prisma.liveAnalyse.groupBy({ by: ["theme"], _count: { _all: true } });
  return groups
    .map((group) => ({ slug: group.theme, label: liveThemeLabel(group.theme), count: group._count._all }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "fr"));
}

// Bascule le favori d'une analyse. Met à jour CE SEUL champ (jamais le
// contenu de l'analyse). Retourne null si l'analyse n'existe pas.
export async function setLiveFavori(id, favori) {
  try {
    return await prisma.liveAnalyse.update({
      where: { id },
      data: { favori },
      select: { id: true, favori: true },
    });
  } catch (error) {
    if (error.code === "P2025") return null;
    throw error;
  }
}
