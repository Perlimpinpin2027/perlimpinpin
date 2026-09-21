import { getLiveUser, sessionExpiredResponse } from "@/lib/live-auth";
import { LiveAnalyseError } from "@/lib/live-analyse";
import { getLiveAnalyseDetail, setLiveQuestions } from "@/lib/live-history";
import { genererInterviewComplete } from "@/lib/live-interview";

// Un appel Claude non streamé de quelques dizaines de secondes.
export const maxDuration = 90;

// POST /api/live/analyses/:id/interview : étoffe les questions d'interview d'une
// analyse enregistrée (12 à 15 questions). Ne regénère NI le score NI les
// affirmations ; seul le champ `questions` de l'enregistrement est mis à jour.
export async function POST(request, { params }) {
  // Le proxy ne couvre que /live : cette route (appel payant) revérifie la session.
  const user = await getLiveUser();
  if (!user) return sessionExpiredResponse();

  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    return Response.json({ error: "Identifiant invalide." }, { status: 400 });
  }

  try {
    const detail = await getLiveAnalyseDetail(id);
    if (!detail) return Response.json({ error: "Analyse introuvable." }, { status: 404 });
    if (detail.mesures.length === 0) {
      return Response.json({ error: "Cette analyse ne contient aucune mesure à interroger." }, { status: 422 });
    }

    const questions = await genererInterviewComplete(detail);
    const stored = { ...questions, etendu: true };
    await setLiveQuestions(id, stored);
    return Response.json({ questions: stored });
  } catch (error) {
    if (error instanceof LiveAnalyseError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error("[live] interview complète impossible :", error);
    return Response.json({ error: "Erreur interne." }, { status: 500 });
  }
}
