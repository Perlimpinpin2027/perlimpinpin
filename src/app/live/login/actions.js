"use server";

import { cookies } from "next/headers";
import {
  LIVE_COOKIE_NAME,
  LIVE_SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  isValidPassword,
} from "@/lib/live-session";

export async function login(_previousState, formData) {
  const password = formData.get("password");

  if (!isValidPassword(password)) {
    return { error: "Mot de passe incorrect." };
  }

  const token = createSessionToken();
  if (!token) {
    return { error: "Accès /live non configuré côté serveur." };
  }

  const cookieStore = await cookies();
  cookieStore.set(LIVE_COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: LIVE_SESSION_MAX_AGE_SECONDS,
  });

  // Pas de redirect() ici : c'est le client qui charge /live par une navigation
  // de page complète (voir LoginForm), pour ne dépendre ni du rechargement
  // interne de la cible par Next ni de la navigation RSC côté client.
  return { ok: true };
}
