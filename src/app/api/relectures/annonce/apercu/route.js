import { readFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/relecture-admin";
import { SLUG_PATTERN } from "@/lib/relecture-revision";
import { NOM_APERCU, fichesAAnnoncer, prenomDepuisNom, redigerAnnonce } from "@/lib/relecture-annonce";

// Aperçu du mail d'annonce des fiches en relecture (/relectures, mode comité,
// bouton « Prévenir les adhérents »). Réservé au comité (en-tête
// x-relecture-admin-code). Base en lecture seule, AUCUN envoi.
// Destinataires éligibles : adhérents non désinscrits des appels à relecture.
// Seul leur nombre est renvoyé, jamais les adresses.

function lireFiche(ficheSlug) {
  // Slug vérifié par SLUG_PATTERN : pas de chemin arbitraire.
  if (!SLUG_PATTERN.test(ficheSlug)) return null;
  try {
    return JSON.parse(readFileSync(join(process.cwd(), "data", "relectures", `${ficheSlug}.json`), "utf8"));
  } catch {
    return null;
  }
}

export async function POST(request) {
  if (!isAdmin(request)) {
    return Response.json({ error: "Code admin absent ou invalide." }, { status: 401 });
  }

  const [chronos, nbDestinataires] = await Promise.all([
    prisma.relectureFiche.findMany({ where: { reviewDeadline: { not: null } } }),
    prisma.adherent.count({ where: { desinscritMailsRelectureAt: null } }),
  ]);
  const fiches = fichesAAnnoncer({ chronos, lireFiche });
  if (!fiches.length) {
    return Response.json({ error: "Aucune fiche avec chrono en cours." }, { status: 409 });
  }

  const { sujet, texte, html } = redigerAnnonce({ fiches, prenom: prenomDepuisNom(NOM_APERCU) });
  return Response.json({ sujet, texte, html, nbDestinataires, fiches });
}
