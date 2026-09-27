import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { isRelectureClosed } from "@/lib/relecture";

// Chronomètre de relecture des fiches en brouillon (/relectures).
// GET : lecture publique de l'état des chronos (pour l'affichage des cartes).
// POST : lancer / prolonger / arrêter / clore maintenant, réservé au comité via le code admin
// (en-tête x-relecture-admin-code, comparé à RELECTURE_ADMIN_CODE).
// Aucune publication automatique : l'échéance ne fait que fermer la relecture.

const SLUG_PATTERN = /^[a-z0-9-]{1,120}$/;
const MIN_DURATION_MS = 60 * 1000; // 1 minute (tests)
const MAX_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 jours

function serialize(fiche) {
  return {
    ficheSlug: fiche.ficheSlug,
    reviewStartedAt: fiche.reviewStartedAt,
    reviewDeadline: fiche.reviewDeadline,
  };
}

function isAdmin(request) {
  const expected = process.env.RELECTURE_ADMIN_CODE;
  const given = request.headers.get("x-relecture-admin-code");
  // Même règle que TEST_EDIT_CODE : un code trop court désactive les actions.
  if (!expected || expected.length < 12 || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Durée saisie en heures ou en minutes (unit: "h" | "min"), renvoyée en ms.
function parseDuration(data) {
  const value = Number(data.duration);
  const unit = data.unit === "min" ? "min" : "h";
  if (!Number.isFinite(value) || value <= 0) return null;
  const ms = Math.round(value * (unit === "min" ? 60 : 3600) * 1000);
  if (ms < MIN_DURATION_MS || ms > MAX_DURATION_MS) return null;
  return ms;
}

export async function GET() {
  const fiches = await prisma.relectureFiche.findMany();
  return Response.json({ now: new Date(), fiches: fiches.map(serialize) });
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
  const action = String(data.action || "");
  if (!SLUG_PATTERN.test(ficheSlug)) {
    return Response.json({ error: "ficheSlug invalide." }, { status: 400 });
  }
  if (!["start", "extend", "stop", "close"].includes(action)) {
    return Response.json({ error: "Action inconnue." }, { status: 400 });
  }

  const now = new Date();
  const existing = await prisma.relectureFiche.findUnique({ where: { ficheSlug } });

  if (action === "stop") {
    // Arrêter = annuler le chrono : la fiche redevient "À relire" sans échéance.
    if (!existing) {
      return Response.json({ error: "Aucun chrono sur cette fiche." }, { status: 404 });
    }
    const fiche = await prisma.relectureFiche.update({
      where: { ficheSlug },
      data: { reviewStartedAt: null, reviewDeadline: null },
    });
    return Response.json({ now, fiche: serialize(fiche) });
  }

  if (action === "close") {
    // Clore maintenant = échéance ramenée à l'instant présent : commentaires
    // fermés, fiche "Prête à publier". Rien d'autre n'est touché.
    if (!existing?.reviewDeadline) {
      return Response.json({ error: "Aucun chrono lancé sur cette fiche." }, { status: 409 });
    }
    if (isRelectureClosed(existing, now)) {
      return Response.json({ error: "Relecture déjà terminée." }, { status: 409 });
    }
    const fiche = await prisma.relectureFiche.update({
      where: { ficheSlug },
      data: { reviewDeadline: now },
    });
    return Response.json({ now, fiche: serialize(fiche) });
  }

  const durationMs = parseDuration(data);
  if (!durationMs) {
    return Response.json(
      { error: "Durée invalide (entre 1 minute et 30 jours)." },
      { status: 400 },
    );
  }

  if (action === "start") {
    if (existing?.reviewDeadline) {
      return Response.json(
        { error: "Chrono déjà lancé : prolonge-le ou arrête-le d'abord." },
        { status: 409 },
      );
    }
    const values = {
      reviewStartedAt: now,
      reviewDeadline: new Date(now.getTime() + durationMs),
    };
    // Pas d'upsert : création si la fiche n'a jamais eu de chrono, sinon mise à jour.
    const fiche = existing
      ? await prisma.relectureFiche.update({ where: { ficheSlug }, data: values })
      : await prisma.relectureFiche.create({ data: { ficheSlug, ...values } });
    return Response.json({ now, fiche: serialize(fiche) }, { status: existing ? 200 : 201 });
  }

  // extend : on ajoute la durée à l'échéance, ou à maintenant si elle est déjà passée.
  if (!existing?.reviewDeadline) {
    return Response.json({ error: "Aucun chrono lancé sur cette fiche." }, { status: 409 });
  }
  const base = Math.max(existing.reviewDeadline.getTime(), now.getTime());
  const fiche = await prisma.relectureFiche.update({
    where: { ficheSlug },
    data: { reviewDeadline: new Date(base + durationMs) },
  });
  return Response.json({ now, fiche: serialize(fiche) });
}
