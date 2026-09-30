import { cache } from "react";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  RELECTURE_COOKIE_NAME,
  creerSession,
  lireSession,
  optionsCookie,
} from "@/lib/relecture-auth-core";

// Session adhérent de /relectures, côté serveur uniquement. Le proxy ne fait
// qu'un contrôle rapide du cookie (signature, expiration) ; getAdherent() est
// le vrai contrôle : cookie valide ET compte toujours présent et activé.

// Adhérent connecté { id, email, nom }, ou null (pas de cookie, cookie invalide
// ou expiré, compte supprimé ou réinitialisé, secret absent : fail closed).
export const getAdherent = cache(async () => {
  try {
    const valeur = (await cookies()).get(RELECTURE_COOKIE_NAME)?.value;
    const session = lireSession({ secret: process.env.AUTH_SECRET, valeur });
    if (!session) return null;

    const adherent = await prisma.adherent.findUnique({
      where: { id: session.adherentId },
      select: { id: true, email: true, nom: true, motDePasseHash: true, activatedAt: true },
    });
    if (!adherent?.motDePasseHash) return null;
    // Session ouverte avant la dernière activation (compte réinitialisé par
    // scripts/reset-adherent.js puis réactivé) : elle ne vaut plus.
    if (!adherent.activatedAt || adherent.activatedAt.getTime() > session.emiseLe) return null;

    return { id: adherent.id, email: adherent.email, nom: adherent.nom };
  } catch (error) {
    // Les signaux internes de Next (rendu dynamique…) ne sont pas des erreurs de
    // session : on les laisse remonter (même précaution que dans /live et /test).
    const digest = typeof error?.digest === "string" ? error.digest : "";
    if (digest === "DYNAMIC_SERVER_USAGE" || digest.startsWith("NEXT_") || digest.startsWith("BAILOUT")) throw error;
    console.error("[relectures] lecture de la session impossible :", error);
    return null;
  }
});

// Pose le cookie de session (à appeler depuis une action serveur ou une route).
export async function ouvrirSession(adherentId) {
  const valeur = creerSession({ secret: process.env.AUTH_SECRET, adherentId });
  (await cookies()).set(RELECTURE_COOKIE_NAME, valeur, optionsCookie());
}

export async function fermerSession() {
  (await cookies()).delete({ name: RELECTURE_COOKIE_NAME, path: "/" });
}
