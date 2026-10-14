import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";
import { isEditor } from "@/lib/test-auth";
import { formatScore } from "@/lib/score";
import { FORMATS_CARTE, appreciationCarte, cacheControlCarte, slugCandidat, titreCarte, versionCarte } from "@/lib/carte";
import { TAILLE, elementCarte } from "./cartes";

// Cartes 1200×1200 des publications X : ?format=score|chiffre|tient.
// Fiche publiée : ouverte à tous, image mise en cache longtemps (URL versionnée,
// voir cheminCarte dans src/lib/carte.js). Brouillon (?brouillon=1) : réservé
// aux personnes déverrouillées sur /test, jamais en cache partagé.
// Aucune IA ici : les textes de « chiffre » et « tient » viennent de
// contenuComplet.reseaux (étape 3 ter du pipeline) ; sans eux, 404.

let policesEnCache = null;
function polices() {
  policesEnCache ??= Promise.all(
    [
      ["Inter-ExtraBold.otf", 800],
      ["Inter-Medium.otf", 500],
    ].map(async ([fichier, weight]) => ({
      name: "Inter",
      data: await readFile(join(process.cwd(), "public", "fonts", fichier)),
      weight,
      style: "normal",
    })),
  );
  return policesEnCache;
}

// Portrait bleu détouré (public/portraits-bleus/<slug>.png), en data URI.
// Fichier absent : la carte s'affiche sans portrait.
async function portrait(candidat) {
  try {
    const png = await readFile(join(process.cwd(), "public", "portraits-bleus", `${slugCandidat(candidat)}.png`));
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return null;
  }
}

function introuvable() {
  return new Response("Carte introuvable.", { status: 404, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request, { params }) {
  const { id } = await params;
  const propositionId = Number(id);
  const recherche = new URL(request.url).searchParams;
  const format = recherche.get("format") ?? "score";
  if (!Number.isInteger(propositionId) || !FORMATS_CARTE.includes(format)) return introuvable();

  // Brouillon : même contrôle que /test (cookie d'édition valide).
  const brouillon = recherche.get("brouillon") === "1";
  if (brouillon && !(await isEditor())) return introuvable();

  const proposition = await prisma.proposition.findUnique({
    where: { id: propositionId },
    select: {
      titre: true,
      texteOriginal: true,
      candidat: { select: { nom: true, photoUrl: true } },
      analyses: {
        ...(brouillon ? {} : { where: { statut: "publie" } }),
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, statut: true, scoreFaisabilite: true, contenuComplet: true },
      },
    },
  });
  const analyse = proposition?.analyses[0];
  if (!analyse) return introuvable();

  const reseaux = analyse.contenuComplet?.reseaux;
  if (format === "chiffre" && !reseaux?.chiffre?.valeur) return introuvable();
  if (format === "tient" && !reseaux?.tient?.titre) return introuvable();

  const titre = titreCarte(proposition);
  const element = elementCarte({
    format,
    titre,
    reseaux,
    candidat: proposition.candidat,
    photo: await portrait(proposition.candidat),
    score: formatScore(analyse.scoreFaisabilite),
    appreciation: appreciationCarte(analyse.scoreFaisabilite),
  });

  return new ImageResponse(element, {
    width: TAILLE,
    height: TAILLE,
    fonts: await polices(),
    headers: {
      "Cache-Control": cacheControlCarte({
        publie: analyse.statut === "publie",
        versionDemandee: recherche.get("v"),
        versionCourante: versionCarte({
          analyseId: analyse.id,
          titre,
          candidatNom: proposition.candidat.nom,
          score: analyse.scoreFaisabilite,
          reseaux,
        }),
      }),
    },
  });
}
