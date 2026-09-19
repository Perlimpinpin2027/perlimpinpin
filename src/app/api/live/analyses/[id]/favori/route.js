import { cookies } from "next/headers";
import { LIVE_COOKIE_NAME, verifySessionToken } from "@/lib/live-session";
import { setLiveFavori } from "@/lib/live-history";

// PATCH /api/live/analyses/:id/favori  { "favori": true | false }
// Ne modifie que le champ `favori` de l'analyse.
export async function PATCH(request, { params }) {
  // Le proxy ne couvre que /live : cette route revérifie la session.
  const token = (await cookies()).get(LIVE_COOKIE_NAME)?.value;
  if (!verifySessionToken(token)) {
    return Response.json({ error: "Session expirée. Reconnectez-vous." }, { status: 401 });
  }

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
    const updated = await setLiveFavori(id, body.favori);
    if (!updated) return Response.json({ error: "Analyse introuvable." }, { status: 404 });
    return Response.json(updated);
  } catch (error) {
    console.error("[live] mise à jour du favori impossible :", error);
    return Response.json({ error: "Erreur interne." }, { status: 500 });
  }
}
