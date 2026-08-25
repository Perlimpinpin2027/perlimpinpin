import { prisma } from "@/lib/prisma";

const MESSAGE_MAX_LENGTH = 2000;
const NOM_MAX_LENGTH = 200;
const EMAIL_MAX_LENGTH = 320;

export async function POST(request) {
  const body = await request.json().catch(() => null);

  const message = typeof body?.message === "string" ? body.message.trim() : "";
  const nom = typeof body?.nom === "string" ? body.nom.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim() : "";

  if (!message || message.length > MESSAGE_MAX_LENGTH) {
    return Response.json({ error: "Le message est requis et ne doit pas dépasser 2000 caractères." }, { status: 400 });
  }
  if (nom.length > NOM_MAX_LENGTH || email.length > EMAIL_MAX_LENGTH) {
    return Response.json({ error: "Requête invalide." }, { status: 400 });
  }

  await prisma.messageContact.create({
    data: {
      nom: nom || null,
      email: email || null,
      message,
    },
  });

  return Response.json({ ok: true }, { status: 201 });
}
