"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { isEditor } from "@/lib/test-auth";
import { PAGES_EDITABLES, normaliserTexteSite, validerTexteSite } from "@/lib/textes-site";

// Actions serveur de l'édition des textes du site (/test/textes/...).
// Rappel : une action serveur est appelable par n'importe qui. C'est donc ICI
// (et pas dans les boutons) qu'on vérifie le code d'édition, à chaque appel.

const NON_AUTORISE = { ok: false, message: "Non autorisé." };
const CONFLIT = {
  ok: false,
  message:
    "Ce texte a été modifié entre-temps (autre onglet ou autre personne). Recharge la page pour voir la dernière version.",
};
const SIMULATION = { ok: true, simulation: true, message: "Mode simulation : rien n'a été enregistré." };

// Retrouve la page et le champ dans le catalogue. Refuse toute clé inconnue :
// on ne peut pas créer de texte arbitraire en base.
function trouverChamp(page, cle) {
  if (typeof page !== "string" || typeof cle !== "string") return null;
  if (!Object.hasOwn(PAGES_EDITABLES, page)) return null;
  const definition = PAGES_EDITABLES[page];
  const champ = definition.champs.find((c) => c.cle === cle);
  return champ ? { definition, champ } : null;
}

function versionValide(version) {
  return Number.isInteger(version) && version >= 0;
}

// Ligne d'audit JSON dans les logs Vercel (l'ancien texte y est conservé).
function journaliser(evenement, { page, cle, avant, apres }) {
  console.log(JSON.stringify({ evenement, date: new Date().toISOString(), page, cle, avant, apres }));
}

// La page publique est en cache : on demande à Next de la recalculer tout de suite.
function revalider(definition, page) {
  revalidatePath(definition.chemin);
  revalidatePath(`/test/textes/${page}`);
}

// Enregistre un nouveau texte. versionAttendue = la version que l'éditeur a
// vue (0 si le texte n'avait jamais été modifié). Si elle ne correspond plus,
// quelqu'un a modifié le texte entre-temps : on refuse plutôt que d'écraser.
export async function enregistrerTexteSite({ page, cle, valeur, versionAttendue }) {
  if (!(await isEditor())) {
    console.warn("[textes-site] modification refusée (non autorisé)");
    return NON_AUTORISE;
  }
  const cible = trouverChamp(page, cle);
  if (!cible || !versionValide(versionAttendue)) return { ok: false, message: "Requête invalide." };

  const texte = normaliserTexteSite(valeur);
  const controle = validerTexteSite(texte);
  if (!controle.ok) return controle;

  if (process.env.TEST_DRY_RUN === "1") return SIMULATION;

  try {
    const avant = await prisma.texteSite.findUnique({
      where: { page_cle: { page, cle } },
      select: { valeur: true, version: true },
    });
    if ((avant?.version ?? 0) !== versionAttendue) return CONFLIT;

    if (!avant) {
      // Première modification de ce texte. Si quelqu'un l'a créé au même
      // instant, la clé primaire refuse le doublon (P2002) : conflit.
      await prisma.texteSite.create({ data: { page, cle, valeur: texte } });
    } else {
      // Mise à jour seulement si la version n'a pas bougé.
      const { count } = await prisma.texteSite.updateMany({
        where: { page, cle, version: versionAttendue },
        data: { valeur: texte, version: { increment: 1 } },
      });
      if (count === 0) return CONFLIT;
    }

    journaliser("texte_site_modifie", {
      page,
      cle,
      avant: avant?.valeur ?? cible.champ.defaut,
      apres: texte,
    });
  } catch (error) {
    if (error?.code === "P2002") return CONFLIT;
    console.error("[textes-site] enregistrement impossible :", error);
    return { ok: false, message: "L'enregistrement a échoué. Réessaie." };
  }

  revalider(cible.definition, page);
  return { ok: true };
}

// Revient au texte par défaut (celui de src/lib/textes-site.js) en supprimant
// la ligne en base. Même contrôle de version que pour l'enregistrement.
export async function reinitialiserTexteSite({ page, cle, versionAttendue }) {
  if (!(await isEditor())) {
    console.warn("[textes-site] réinitialisation refusée (non autorisé)");
    return NON_AUTORISE;
  }
  const cible = trouverChamp(page, cle);
  if (!cible || !versionValide(versionAttendue) || versionAttendue === 0) {
    return { ok: false, message: "Requête invalide." };
  }

  if (process.env.TEST_DRY_RUN === "1") return SIMULATION;

  try {
    const avant = await prisma.texteSite.findUnique({
      where: { page_cle: { page, cle } },
      select: { valeur: true },
    });
    const { count } = await prisma.texteSite.deleteMany({
      where: { page, cle, version: versionAttendue },
    });
    if (count === 0) return CONFLIT;

    journaliser("texte_site_reinitialise", {
      page,
      cle,
      avant: avant?.valeur ?? null,
      apres: cible.champ.defaut,
    });
  } catch (error) {
    console.error("[textes-site] réinitialisation impossible :", error);
    return { ok: false, message: "La réinitialisation a échoué. Réessaie." };
  }

  revalider(cible.definition, page);
  return { ok: true };
}
