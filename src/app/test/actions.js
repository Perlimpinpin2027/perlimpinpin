"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isEditor } from "@/lib/test-auth";
import {
  EDIT_COOKIE_NAME,
  EDIT_SESSION_MS,
  codeUtilisable,
  codesIdentiques,
  creerSession,
  secretUtilisable,
} from "@/lib/test-auth-core";
import { enregistrerTexteCore } from "@/lib/test-enregistrer";
import { publierBrouillonCore } from "@/lib/test-publier";

// Actions serveur de /test. Rappel : un fichier "use server" n'exporte que des
// fonctions asynchrones, et chacune est appelable depuis n'importe quel client :
// c'est donc ELLES (pas les boutons) qui contrôlent l'accès.

// Les options du cookie doivent être identiques à la pose et à l'effacement.
function optionsCookie(maxAge) {
  return {
    httpOnly: true,
    sameSite: "strict",
    path: "/test",
    // En local (http), un cookie « secure » serait refusé par le navigateur.
    secure: process.env.NODE_ENV === "production",
    maxAge,
  };
}

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Saisie du code d'édition. En cas d'échec, on attend ~1 s avant de répondre
// pour freiner les essais en rafale.
export async function deverrouiller(prevState, formData) {
  const attendu = process.env.TEST_EDIT_CODE;
  const secret = process.env.AUTH_SECRET;
  const saisi = formData?.get("code");

  const configure = codeUtilisable(attendu) && secretUtilisable(secret);
  // Toujours comparer (même non configuré) pour garder le même temps de réponse.
  const bon = codesIdentiques(typeof saisi === "string" ? saisi : "", configure ? attendu : "");

  if (!configure || !bon) {
    await pause(1000);
    return { ok: false, message: "Code incorrect." };
  }

  const valeur = creerSession({ secret, code: attendu });
  (await cookies()).set(EDIT_COOKIE_NAME, valeur, optionsCookie(EDIT_SESSION_MS / 1000));
  return { ok: true, message: "" };
}

export async function verrouiller() {
  // Efface le cookie (même chemin que celui posé, sinon le navigateur l'ignore).
  (await cookies()).set(EDIT_COOKIE_NAME, "", optionsCookie(0));
  return { ok: true, message: "" };
}

// Publie un brouillon (voir src/lib/test-publier.js pour les règles).
export async function publierBrouillon(analyseId) {
  const resultat = await publierBrouillonCore(analyseId, {
    isEditor,
    prisma,
    dryRun: process.env.TEST_DRY_RUN === "1",
  });

  if (!resultat.ok) {
    if (resultat.message === "Non autorisé.") {
      console.warn(`[test] publication refusée (non autorisé) : analyse ${analyseId}`);
    }
    return resultat;
  }
  if (resultat.simulation) return resultat;

  // Ligne d'audit pour les logs Vercel.
  console.log(
    `[test] analyse #${resultat.analyseId} publiée (mesure #${resultat.propositionId}, ${resultat.candidatNom}) le ${new Date().toISOString()}`,
  );

  // Les pages publiques mises en cache doivent voir la nouvelle analyse.
  for (const chemin of ["/", "/declarations", "/candidats", "/themes"]) {
    revalidatePath(chemin);
  }

  // redirect lève une exception : il doit rester hors de tout try/catch.
  redirect(`/declarations/${resultat.propositionId}`);
}

// Enregistre le nouveau texte d'un champ d'un brouillon (titre, résumé…). Les
// règles (accès, champ autorisé, brouillon le plus récent, concurrence, simulation,
// transaction) sont dans src/lib/test-enregistrer.js.
export async function enregistrerTexte(entree) {
  const resultat = await enregistrerTexteCore(entree, {
    isEditor,
    prisma,
    dryRun: process.env.TEST_DRY_RUN === "1",
  });

  if (!resultat.ok) {
    if (resultat.message === "Non autorisé.") {
      console.warn("[test] modification de texte refusée (non autorisé)");
    }
    return resultat;
  }
  if (resultat.simulation) return resultat;

  // Ligne d'audit JSON pour les logs Vercel : l'ancien texte y est conservé,
  // pour le retrouver si besoin.
  console.log(
    JSON.stringify({
      evenement: "test_modification_texte",
      date: new Date().toISOString(),
      analyseId: resultat.analyseId,
      champ: resultat.champ,
      avant: resultat.avant,
      apres: resultat.apres,
    }),
  );

  revalidatePath("/test");
  revalidatePath(`/test/${resultat.propositionId}`);

  return { ok: true, versionSuivante: resultat.versionSuivante };
}
