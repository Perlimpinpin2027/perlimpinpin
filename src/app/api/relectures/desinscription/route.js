import { prisma } from "@/lib/prisma";
import { CHEMIN_PAGE, lireJeton } from "@/lib/desinscription-core";

// Désinscription des appels à relecture, en POST uniquement :
//   - bouton de la page /relectures/desinscription (formulaire) : renvoie vers
//     la page de confirmation (303) ;
//   - désinscription en un clic de Gmail / Outlook (en-têtes List-Unsubscribe et
//     List-Unsubscribe-Post des mails, RFC 8058) : corps
//     « List-Unsubscribe=One-Click », réponse 200 sans redirection.
// Hors du proxy (/api) : aucune session exigée, le jeton signé suffit.
// Pas de GET : un lien ouvert automatiquement ne désinscrit jamais personne.

export async function POST(request) {
  const url = new URL(request.url);
  const corps = await request.text().catch(() => "");
  const unClic = /(^|&)List-Unsubscribe=One-Click(&|$)/.test(corps);

  const adherentId = lireJeton({ secret: process.env.AUTH_SECRET, jeton: url.searchParams.get("t") ?? "" });
  if (!adherentId) {
    // Message neutre, sans dire si un compte existe.
    if (unClic) return new Response("Lien invalide.", { status: 400 });
    return Response.redirect(new URL(`${CHEMIN_PAGE}?t=invalide`, request.url), 303);
  }

  // Seulement si pas déjà désinscrit (la date de la première désinscription est
  // gardée). updateMany : aucune erreur si le compte n'existe pas (ou plus),
  // donc même réponse dans tous les cas.
  await prisma.adherent.updateMany({
    where: { id: adherentId, desinscritMailsRelectureAt: null },
    data: { desinscritMailsRelectureAt: new Date() },
  });

  if (unClic) return new Response("Désinscription enregistrée.", { status: 200 });
  return Response.redirect(new URL(`${CHEMIN_PAGE}?fait=1`, request.url), 303);
}
