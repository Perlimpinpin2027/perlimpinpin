import { cache } from "react";
import { auth } from "@/auth";
import { getLiveUserById } from "@/lib/live-users";

// Couche d'accès à la session de /live (« Data Access Layer »). Toutes les pages et
// routes API protégées passent par ici : le proxy ne fait qu'un contrôle rapide du
// cookie, celui-ci est le vrai (session valide ET compte toujours présent en base).

// Journaliste connecté { id, email, nom }, ou null (pas de session, session expirée,
// compte supprimé, ou authentification mal configurée : fail closed).
export const getLiveUser = cache(async () => {
  try {
    const session = await auth();
    const id = Number(session?.user?.id);
    if (!Number.isInteger(id) || id <= 0) return null;
    return await getLiveUserById(id);
  } catch (error) {
    // Les signaux internes de Next (rendu dynamique, redirection…) ne sont pas des
    // erreurs de session : on les laisse remonter.
    const digest = typeof error?.digest === "string" ? error.digest : "";
    if (digest === "DYNAMIC_SERVER_USAGE" || digest.startsWith("NEXT_") || digest.startsWith("BAILOUT")) throw error;
    console.error("[live] lecture de la session impossible :", error);
    return null;
  }
});

// Réponse JSON 401 commune aux routes API.
export function sessionExpiredResponse() {
  return Response.json({ error: "Session expirée. Reconnectez-vous." }, { status: 401 });
}
