import { cookies } from "next/headers";
import { LIVE_COOKIE_NAME, verifySessionToken } from "@/lib/live-session";
import { extractFromUrl } from "@/lib/live-extract";
import { ExtractError, URL_UNREACHABLE_MESSAGE } from "@/lib/live-url";

export const maxDuration = 30;

// POST /api/live/extract/url { "url": "https://…" } : renvoie le texte lisible
// de l'article. Seules les URLs publiques http/https sont acceptées (voir
// live-url.js : protection contre le SSRF). Aucune analyse ni écriture en base.
export async function POST(request) {
  // Le proxy ne couvre que /live : cette route revérifie la session.
  const token = (await cookies()).get(LIVE_COOKIE_NAME)?.value;
  if (!verifySessionToken(token)) {
    return Response.json({ error: "Session expirée. Reconnectez-vous." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (typeof body?.url !== "string" || body.url.trim().length === 0 || body.url.length > 2048) {
    return Response.json({ error: "Collez le lien d'un article." }, { status: 400 });
  }

  try {
    return Response.json(await extractFromUrl(body.url));
  } catch (error) {
    if (error instanceof ExtractError) {
      return Response.json({ error: error.message }, { status: 422 });
    }
    console.error("[live] extraction d'URL impossible :", error);
    return Response.json({ error: URL_UNREACHABLE_MESSAGE }, { status: 422 });
  }
}
