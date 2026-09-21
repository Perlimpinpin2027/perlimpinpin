import { getLiveUser, sessionExpiredResponse } from "@/lib/live-auth";
import { setLiveFavori } from "@/lib/live-history";

// PATCH /api/live/analyses/:id/favori  { "favori": true | false }
// Ajoute ou retire l'analyse des favoris du journaliste connecté (favoris personnels :
// ceux des autres ne sont jamais touchés).
export async function PATCH(request, { params }) {
  // Le proxy ne couvre que /live : cette route revérifie la session.
  const user = await getLiveUser();
  if (!user) return sessionExpiredResponse();

  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    return Response.json({ error: "Identifiant invalide." }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  if (typeof body?.favori !== "boolean") {
    return Response.json({ error: "Le champ « favori » doit être un booléen." }, { status: 400 });
  }

  try {
    const updated = await setLiveFavori(user.id, id, body.favori);
    if (!updated) return Response.json({ error: "Analyse introuvable." }, { status: 404 });
    return Response.json(updated);
  } catch (error) {
    console.error("[live] mise à jour du favori impossible :", error);
    return Response.json({ error: "Erreur interne." }, { status: 500 });
  }
}
