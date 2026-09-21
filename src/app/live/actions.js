"use server";

import { cookies } from "next/headers";
import { getLiveUser } from "@/lib/live-auth";
import { SCOPE_COOKIE_NAME, normalizeScope } from "@/lib/live-scope";

// Mémorise la portée des listes : « mes » (Mes analyses) ou « toutes » (Toutes les
// analyses). Simple préférence d'affichage ; les listes sont filtrées côté serveur.
export async function setScope(value) {
  if (!(await getLiveUser())) return { ok: false };
  const scope = normalizeScope(value);
  (await cookies()).set(SCOPE_COOKIE_NAME, scope, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/live",
    maxAge: 60 * 60 * 24 * 365,
  });
  return { ok: true, scope };
}
