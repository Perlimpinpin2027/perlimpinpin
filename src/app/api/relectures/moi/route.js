import { getAdherent } from "@/lib/relecture-auth";
import { SESSION_EXPIREE } from "@/lib/relecture-comments-core";

// Adhérent connecté (bandeau de la page /relectures) : { nom, email }, ou 401.
export async function GET() {
  const adherent = await getAdherent();
  if (!adherent) return Response.json(SESSION_EXPIREE, { status: 401 });
  return Response.json({ nom: adherent.nom, email: adherent.email });
}
