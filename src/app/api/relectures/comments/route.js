import { prisma } from "@/lib/prisma";
import { formatClosedAt, isRelectureClosed } from "@/lib/relecture";

const BODY_MAX_LENGTH = 4000;

export async function GET(request) {
  const ficheSlug = request.nextUrl.searchParams.get("fiche");
  if (!ficheSlug) {
    return Response.json({ error: "Paramètre 'fiche' manquant." }, { status: 400 });
  }

  const comments = await prisma.relectureComment.findMany({
    where: { ficheSlug },
    orderBy: { createdAt: "asc" },
  });

  return Response.json(comments);
}

export async function POST(request) {
  const data = await request.json().catch(() => null);
  if (!data) {
    return Response.json({ error: "JSON invalide." }, { status: 400 });
  }

  const ficheSlug = String(data.ficheSlug || "").trim();
  const sectionId = String(data.sectionId || "").trim();
  const sectionLabel = String(data.sectionLabel || "").trim().slice(0, 200) || null;
  const authorName = String(data.authorName || "").trim().slice(0, 80) || null;
  const body = String(data.body || "").trim().slice(0, BODY_MAX_LENGTH);

  if (!ficheSlug || !sectionId || !body) {
    return Response.json({ error: "Champs requis manquants." }, { status: 400 });
  }

  // Relecture terminée (échéance du chrono passée) : la fiche reste lisible,
  // mais on n'accepte plus de commentaire, quoi que fasse la page.
  const fiche = await prisma.relectureFiche.findUnique({ where: { ficheSlug } });
  if (isRelectureClosed(fiche)) {
    return Response.json(
      {
        error: `Relecture terminée le ${formatClosedAt(fiche.reviewDeadline)} : les commentaires sont fermés.`,
        closed: true,
      },
      { status: 403 },
    );
  }

  const comment = await prisma.relectureComment.create({
    data: { ficheSlug, sectionId, sectionLabel, authorName, body },
  });

  return Response.json(comment, { status: 201 });
}
