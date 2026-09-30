import { prisma } from "@/lib/prisma";
import { getAdherent } from "@/lib/relecture-auth";
import { SESSION_EXPIREE } from "@/lib/relecture-comments-core";
import { bilanAdherent } from "@/lib/club-points-core";

// Adhérent connecté (bandeau et panneau « Mon compte » de la page /relectures),
// ou 401. Les PerlimpinPOINTS sont recalculés à chaque appel depuis ses
// commentaires ; ils ne sont renvoyés qu'à l'adhérent lui-même.
export async function GET() {
  const adherent = await getAdherent();
  if (!adherent) return Response.json(SESSION_EXPIREE, { status: 401 });

  const commentaires = await prisma.relectureComment.findMany({
    where: { adherentId: adherent.id },
    select: { ficheSlug: true, retenu: true },
  });

  return Response.json({
    nom: adherent.nom,
    email: adherent.email,
    // Date de création du mot de passe (activation du compte).
    membreDepuis: adherent.activatedAt,
    ...bilanAdherent(commentaires),
  });
}
