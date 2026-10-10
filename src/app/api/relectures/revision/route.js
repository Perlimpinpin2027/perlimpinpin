import { readFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/relecture-admin";
import { declencherRevision } from "@/lib/github";
import { SLUG_PATTERN, verifierDemande } from "@/lib/relecture-revision";

// « Envoyer en révision » (/relectures, mode comité) : déclenche le robot de
// révision (workflow GitHub revision-relecture.yml) pour une relecture close
// et pas encore archivée. Réservé au comité (en-tête x-relecture-admin-code).
// Base en lecture seule. Jeton GitHub : GITHUB_DISPATCH_TOKEN (Vercel).

function lireFiche(ficheSlug) {
  // Slug déjà validé par SLUG_PATTERN : pas de chemin arbitraire.
  try {
    return JSON.parse(readFileSync(join(process.cwd(), "data", "relectures", `${ficheSlug}.json`), "utf8"));
  } catch {
    return null;
  }
}

export async function POST(request) {
  if (!isAdmin(request)) {
    return Response.json({ error: "Code admin absent ou invalide." }, { status: 401 });
  }

  const data = await request.json().catch(() => null);
  if (!data) {
    return Response.json({ error: "JSON invalide." }, { status: 400 });
  }

  const ficheSlug = String(data.ficheSlug || "").trim();
  const valide = SLUG_PATTERN.test(ficheSlug);
  const refus = verifierDemande({
    ficheSlug,
    fiche: valide ? lireFiche(ficheSlug) : null,
    chrono: valide ? await prisma.relectureFiche.findUnique({ where: { ficheSlug } }) : null,
  });
  if (refus) return Response.json({ error: refus.error }, { status: refus.status });

  try {
    const { lien, dejaLance } = await declencherRevision({
      slug: ficheSlug,
      token: process.env.GITHUB_DISPATCH_TOKEN,
    });
    return Response.json({ lien, dejaLance });
  } catch (e) {
    console.error("Envoi en révision :", e.message);
    return Response.json({ error: e.message }, { status: 502 });
  }
}
