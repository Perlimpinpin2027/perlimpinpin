import { prisma } from "@/lib/prisma";
import { traiterEnvoi } from "@/lib/relecture-annonce-envoi";

// Envoi du mail d'annonce des fiches en relecture (/relectures, mode comité).
// Body { mode: "test" | "reel", confirmation } ; réservé au comité (en-tête
// x-relecture-admin-code). Logique et règles : src/lib/relecture-annonce-envoi.js.

// Une pause de 500 ms entre deux mails : jusqu'à 60 s sur Vercel.
export const maxDuration = 60;

export async function POST(request) {
  const { status, body } = await traiterEnvoi({ request, prisma });
  return Response.json(body, { status });
}
