import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

const EMAIL_MAX_LENGTH = 320;
// Format simple, suffisant pour rejeter les saisies manifestement invalides
// sans reproduire toute la RFC 5322.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const RATE_LIMIT_MAX_REQUESTS = 5;
const RATE_LIMIT_WINDOW_MS = 60_000;
// En mémoire, par instance de serveur : suffisant comme garde-fou basique,
// pas conçu pour tenir la charge derrière plusieurs instances.
const requestTimestampsByIp = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const timestamps = (requestTimestampsByIp.get(ip) ?? []).filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS
  );
  timestamps.push(now);
  requestTimestampsByIp.set(ip, timestamps);
  return timestamps.length > RATE_LIMIT_MAX_REQUESTS;
}

export async function POST(request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(ip)) {
    return Response.json({ error: "Trop de tentatives, réessayez plus tard." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);

  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const consent = body?.consent === true;
  // Honeypot : un champ que seuls les bots remplissent. On répond succès pour
  // ne pas leur signaler qu'ils ont été détectés, sans rien écrire en base.
  const website = typeof body?.website === "string" ? body.website.trim() : "";

  if (website) {
    return Response.json({ ok: true }, { status: 201 });
  }

  if (!email || email.length > EMAIL_MAX_LENGTH || !EMAIL_REGEX.test(email)) {
    return Response.json({ error: "Adresse e-mail invalide." }, { status: 400 });
  }
  if (!consent) {
    return Response.json({ error: "Le consentement est requis." }, { status: 400 });
  }

  try {
    await prisma.newsletterSubscriber.create({
      data: { email },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return Response.json({ alreadySubscribed: true }, { status: 200 });
    }
    throw error;
  }

  return Response.json({ ok: true }, { status: 201 });
}
