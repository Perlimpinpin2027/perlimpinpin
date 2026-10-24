import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/relecture-admin";
import { NOM_APERCU, prenomDepuisNom, redigerAnnonce } from "@/lib/relecture-annonce";
import { ADHERENTS_ELIGIBLES, chargerFiches } from "@/lib/relecture-annonce-envoi";

// Aperçu du mail d'annonce des fiches en relecture (/relectures, mode comité,
// bouton « Prévenir les adhérents »). Réservé au comité (en-tête
// x-relecture-admin-code). Base en lecture seule, AUCUN envoi : l'envoi passe
// par /api/relectures/annonce/envoyer (mêmes fiches, mêmes destinataires).
// Seul le nombre de destinataires est renvoyé, jamais les adresses.

export async function POST(request) {
  if (!isAdmin(request)) {
    return Response.json({ error: "Code admin absent ou invalide." }, { status: 401 });
  }

  const [fiches, nbDestinataires] = await Promise.all([
    chargerFiches(prisma),
    prisma.adherent.count({ where: ADHERENTS_ELIGIBLES }),
  ]);
  if (!fiches.length) {
    return Response.json({ error: "Aucune fiche avec chrono en cours." }, { status: 409 });
  }

  const { sujet, texte, html } = redigerAnnonce({ fiches, prenom: prenomDepuisNom(NOM_APERCU) });
  return Response.json({ sujet, texte, html, nbDestinataires, fiches });
}
