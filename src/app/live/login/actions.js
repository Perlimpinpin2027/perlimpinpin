"use server";

import { cookies } from "next/headers";
import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { postLoginPath } from "@/lib/live-redirect";
import { normalizeEmail } from "@/lib/live-password";
import { SCOPE_COOKIE_NAME } from "@/lib/live-scope";

// La portée des listes (« Mes analyses » / « Toutes ») est une préférence PAR PERSONNE :
// elle est remise à zéro à chaque connexion et déconnexion, pour qu'un journaliste qui
// se connecte sur le même navigateur retrouve toujours « Mes analyses » par défaut.
async function resetScopePreference() {
  (await cookies()).delete({ name: SCOPE_COOKIE_NAME, path: "/live" });
}

// Message unique pour « adresse inconnue » et « mauvais mot de passe » : on ne révèle
// jamais quelles adresses ont un compte.
const BAD_CREDENTIALS = "E-mail ou mot de passe incorrect.";

export async function login(_previousState, formData) {
  const email = normalizeEmail(formData.get("email"));
  const password = formData.get("password");
  // L'adresse saisie est renvoyée avec l'erreur pour ne pas avoir à la retaper
  const typed = typeof formData.get("email") === "string" ? formData.get("email").slice(0, 254) : "";
  if (!email || typeof password !== "string" || password.length === 0) {
    return { error: BAD_CREDENTIALS, email: typed };
  }

  try {
    // redirect: false : Auth.js pose le cookie de session et rend la main
    await signIn("credentials", { email, password, redirect: false });
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.type === "CredentialsSignin") return { error: BAD_CREDENTIALS, email: typed };
      console.error("[live] connexion impossible :", error);
      return { error: "Connexion indisponible pour le moment (accès /live non configuré côté serveur).", email: typed };
    }
    throw error;
  }

  await resetScopePreference();

  // Pas de redirect() ici : c'est le client qui charge la page suivante par une navigation
  // complète (voir LoginForm), pour ne dépendre ni du rechargement interne de la cible
  // par Next ni de la navigation RSC côté client. Destination revalidée ici (le champ du
  // formulaire peut avoir été modifié) : une page interne de /live, ou /live par défaut.
  return { ok: true, redirectTo: postLoginPath(formData.get("next")) };
}

// Déconnexion : supprime le cookie de session. Le client charge ensuite /live/login.
export async function logout() {
  await signOut({ redirect: false });
  await resetScopePreference();
  return { ok: true };
}
