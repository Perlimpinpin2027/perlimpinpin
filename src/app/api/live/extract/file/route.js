import { getLiveUser, sessionExpiredResponse } from "@/lib/live-auth";
import { MAX_FILE_BYTES, extractFromFile } from "@/lib/live-extract";
import { ExtractError } from "@/lib/live-url";

export const maxDuration = 30;

// POST /api/live/extract/file (multipart, champ « file ») : renvoie le texte
// extrait d'un PDF, DOCX ou TXT. Aucune analyse ni écriture en base.
export async function POST(request) {
  // Le proxy ne couvre que /live : cette route revérifie la session.
  const user = await getLiveUser();
  if (!user) return sessionExpiredResponse();

  let file;
  try {
    file = (await request.formData()).get("file");
  } catch {
    return Response.json({ error: "Envoi du fichier invalide." }, { status: 400 });
  }
  if (!file || typeof file === "string" || typeof file.arrayBuffer !== "function") {
    return Response.json({ error: "Aucun fichier reçu." }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return Response.json(
      { error: `Ce fichier dépasse la taille maximale (${MAX_FILE_BYTES / 1024 / 1024} Mo).` },
      { status: 413 },
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { texte, tronque } = await extractFromFile({ buffer, name: file.name ?? "" });
    return Response.json({ texte, tronque, nom: file.name });
  } catch (error) {
    if (error instanceof ExtractError) {
      return Response.json({ error: error.message }, { status: 422 });
    }
    console.error("[live] extraction de fichier impossible :", error);
    return Response.json({ error: "Impossible de lire ce fichier." }, { status: 422 });
  }
}
