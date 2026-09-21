import { cookies } from "next/headers";
import {
  EDIT_COOKIE_NAME,
  codeUtilisable,
  secretUtilisable,
  sessionValide,
} from "@/lib/test-auth-core";

// Code d'édition de /test (indépendant des comptes de /live). À n'importer que
// côté serveur : lit process.env.TEST_EDIT_CODE et le cookie de la requête.

// Le mode édition n'existe que si le code (12 caractères minimum) ET le secret
// de signature sont configurés. Sinon on n'affiche rien et personne n'entre.
export function editionConfiguree() {
  return (
    codeUtilisable(process.env.TEST_EDIT_CODE) &&
    secretUtilisable(process.env.AUTH_SECRET)
  );
}

// Cette requête porte-t-elle un cookie d'édition valide ? Chaque action qui
// écrit en base DOIT l'appeler elle-même : masquer un bouton ne protège rien.
export async function isEditor() {
  if (!editionConfiguree()) return false;
  try {
    // cookies() est asynchrone depuis Next 15.
    const valeur = (await cookies()).get(EDIT_COOKIE_NAME)?.value;
    return sessionValide({
      secret: process.env.AUTH_SECRET,
      code: process.env.TEST_EDIT_CODE,
      valeur,
    });
  } catch (error) {
    // Les signaux internes de Next (rendu dynamique…) ne sont pas des erreurs de
    // session : on les laisse remonter (même précaution que dans l'espace /live).
    const digest = typeof error?.digest === "string" ? error.digest : "";
    if (digest === "DYNAMIC_SERVER_USAGE" || digest.startsWith("NEXT_") || digest.startsWith("BAILOUT")) throw error;
    // Hors requête, ou cookie illisible : échec fermé.
    return false;
  }
}
