import { getLiveUser, sessionExpiredResponse } from "@/lib/live-auth";
import { LiveAnalyseError } from "@/lib/live-analyse";
import { getLiveAnalyseDetail } from "@/lib/live-history";
import { MAX_EXCHANGES, askAboutAnalysis, normalizeQuestion } from "@/lib/live-chat";
import { getLiveChatMessages, saveLiveChatExchange } from "@/lib/live-chat-db";

// Un appel Claude non streamé de quelques secondes.
export const maxDuration = 60;

// POST /api/live/analyses/:id/chat  { "question": "…" }
// Répond à une question sur une analyse enregistrée, uniquement à partir de son
// contenu et de l'historique de la conversation, puis enregistre la question et la
// réponse (deux nouveaux messages, jamais modifiés ensuite). Ne regénère ni le score
// ni les affirmations.
export async function POST(request, { params }) {
  // Le proxy ne couvre que /live : cette route (appel payant) revérifie la session.
  const user = await getLiveUser();
  if (!user) return sessionExpiredResponse();

  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    return Response.json({ error: "Identifiant invalide." }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const question = normalizeQuestion(body?.question);
  if (!question) {
    return Response.json({ error: "Posez une question de 2 à 1 000 caractères." }, { status: 400 });
  }

  try {
    const detail = await getLiveAnalyseDetail(id);
    if (!detail) return Response.json({ error: "Analyse introuvable." }, { status: 404 });

    const history = await getLiveChatMessages(id);
    if (history.length >= MAX_EXCHANGES * 2) {
      return Response.json(
        { error: "Cette conversation a atteint sa longueur maximale. Ouvrez une nouvelle analyse pour poursuivre." },
        { status: 422 },
      );
    }

    const answer = await askAboutAnalysis({ detail, history, question });

    try {
      return Response.json({ messages: await saveLiveChatExchange(id, question, answer), saved: true });
    } catch (error) {
      // La réponse existe déjà : on la renvoie même si l'enregistrement échoue
      console.error("[live] enregistrement du chat impossible :", error);
      return Response.json({
        messages: [
          { id: null, role: "user", content: question, createdAt: new Date().toISOString() },
          { id: null, role: "assistant", content: answer, createdAt: new Date().toISOString() },
        ],
        saved: false,
      });
    }
  } catch (error) {
    if (error instanceof LiveAnalyseError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error("[live] chat impossible :", error);
    return Response.json({ error: "Erreur interne." }, { status: 500 });
  }
}
