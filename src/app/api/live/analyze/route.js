import { cookies } from "next/headers";
import { LIVE_COOKIE_NAME, verifySessionToken } from "@/lib/live-session";
import {
  DECLARATION_MAX_LENGTH,
  DECLARATION_MIN_LENGTH,
  LiveAnalyseError,
  analyseDeclaration,
} from "@/lib/live-analyse";
import { saveLiveAnalyse } from "@/lib/live-history";

// Génération non streamée d'une dizaine à une soixantaine de secondes.
export const maxDuration = 90;

export async function POST(request) {
  // Le proxy ne couvre que /live : cette route API revérifie elle-même la
  // session (elle déclenche un appel payant).
  const token = (await cookies()).get(LIVE_COOKIE_NAME)?.value;
  if (!verifySessionToken(token)) {
    return Response.json({ error: "Session expirée. Reconnectez-vous." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const declaration = typeof body?.declaration === "string" ? body.declaration.trim() : "";
  if (declaration.length < DECLARATION_MIN_LENGTH || declaration.length > DECLARATION_MAX_LENGTH) {
    return Response.json(
      { error: `La déclaration doit faire entre ${DECLARATION_MIN_LENGTH} et ${DECLARATION_MAX_LENGTH} caractères.` },
      { status: 400 },
    );
  }

  // Candidat facultatif (sélecteur du formulaire) : entier positif ou rien.
  const candidatId = Number.isInteger(body?.candidatId) && body.candidatId > 0 ? body.candidatId : null;

  try {
    const resultat = await analyseDeclaration(declaration);
    // Sauvegarde pour l'historique ; ne bloque ni ne fait échouer l'analyse.
    const saved = await saveLiveAnalyse({ declaration, resultat, candidatId });
    // `id` : identifiant de la page dédiée /live/analyses/[id] (null si l'analyse
    // n'a pas pu être enregistrée, ex. aucune mesure analysable).
    return Response.json({ ...resultat, id: saved?.id ?? null });
  } catch (error) {
    if (error instanceof LiveAnalyseError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error("[live] erreur inattendue :", error);
    return Response.json({ error: "Erreur interne." }, { status: 500 });
  }
}
