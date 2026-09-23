import { appliquerModification, lireValeur, validerTexte } from "./test-edition.js";

// Logique de « Enregistrer » d'un texte modifié depuis /test/[id], SANS
// dépendance à Next ni à la vraie base : contrôle d'accès, client Prisma et mode
// simulation sont passés en paramètre, pour la tester avec une fausse base
// (scripts/test-enregistrer.test.js). Le câblage réel est dans src/app/test/actions.js.

const NON_AUTORISE = "Non autorisé.";
const CONFLIT =
  "Ce brouillon a été modifié entre-temps. Recharge la page pour voir la dernière version.";

// Erreur « attendue » lancée dans la transaction pour l'annuler proprement.
class ModificationRefusee extends Error {}

function refus(message) {
  return { ok: false, message };
}

export async function enregistrerTexteCore(entree, { isEditor, prisma, dryRun }) {
  // 1. Accès : avant tout, sans toucher à la base.
  if (!(await isEditor())) return refus(NON_AUTORISE);

  // Tout ce qui vient du navigateur est suspect.
  const { analyseId, champ, valeur, versionAttendue } = entree ?? {};
  if (typeof analyseId !== "number" || !Number.isInteger(analyseId) || analyseId <= 0) {
    return refus("Analyse introuvable.");
  }
  const dateAttendue = typeof versionAttendue === "string" ? new Date(versionAttendue) : null;
  if (!dateAttendue || Number.isNaN(dateAttendue.getTime())) {
    return refus("Version du brouillon invalide. Recharge la page.");
  }

  // 2. Le texte est valide (champ autorisé, longueur, une ligne, gras équilibré…).
  const controle = validerTexte(champ, valeur);
  if (!controle.ok) return refus(controle.message);

  // 3. L'analyse existe, c'est un brouillon, et la plus récente de sa mesure.
  const analyse = await prisma.analyse.findUnique({
    where: { id: analyseId },
    select: {
      id: true,
      statut: true,
      updatedAt: true,
      propositionId: true,
      contenuComplet: true,
    },
  });
  if (!analyse) return refus("Analyse introuvable.");
  if (analyse.statut !== "brouillon") {
    return refus("Cette analyse n'est pas un brouillon : elle ne peut pas être modifiée.");
  }

  const plusRecente = await prisma.analyse.findFirst({
    where: { propositionId: analyse.propositionId },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (plusRecente?.id !== analyse.id) {
    return refus(
      "Ce brouillon n'est pas l'analyse la plus récente de cette mesure : il ne peut pas être modifié.",
    );
  }

  // 4. Concurrence : quelqu'un a-t-il modifié le brouillon depuis l'ouverture de la page ?
  if (analyse.updatedAt.toISOString() !== versionAttendue) return refus(CONFLIT);

  // 5. Nouveau contenu (le garde-fou de appliquerModification lève une erreur si
  // autre chose que le champ visé devait changer).
  let modification;
  try {
    modification = appliquerModification(analyse.contenuComplet, champ, controle.valeur);
  } catch (error) {
    console.error("[test] modification refusée par le garde-fou :", error);
    return refus("Ce brouillon ne peut pas être modifié : son contenu n'a pas la forme attendue.");
  }
  const { contenu, derives } = modification;
  const avant = lireValeur(analyse.contenuComplet, champ);

  // Simulation : on valide tout, on n'écrit RIEN.
  if (dryRun) {
    return {
      ok: true,
      simulation: true,
      message: `[Simulation] Le texte serait enregistré (${controle.valeur.length} caractères).`,
    };
  }

  // 6. Vraie modification. La nouvelle version est fixée explicitement (et
  // strictement postérieure à l'ancienne) : la valeur renvoyée à la page est ainsi
  // exactement celle de la base, sans relecture.
  const versionSuivante = new Date(Math.max(Date.now(), analyse.updatedAt.getTime() + 1));

  try {
    await prisma.$transaction(async (tx) => {
      const { count } = await tx.analyse.updateMany({
        // Toujours un brouillon ET toujours dans l'état vu par l'éditeur : sinon
        // (count = 0) quelqu'un est passé avant, on annule tout.
        where: { id: analyse.id, statut: "brouillon", updatedAt: dateAttendue },
        data: {
          contenuComplet: contenu,
          updatedAt: versionSuivante,
          // Colonnes copiées du champ modifié (resumeAccueil n’en fait jamais partie, voir test-edition.js).
          ...(derives.teaser !== undefined ? { teaser: derives.teaser } : {}),
          ...(derives.verdict !== undefined ? { verdict: derives.verdict } : {}),
          ...(derives.sourcesUtilisees !== undefined ? { sourcesUtilisees: derives.sourcesUtilisees } : {}),
        },
      });
      if (count !== 1) throw new ModificationRefusee(CONFLIT);

      if (derives.titreProposition !== undefined) {
        await tx.proposition.update({
          where: { id: analyse.propositionId },
          data: { titre: derives.titreProposition },
        });
      }
    });
  } catch (error) {
    if (error instanceof ModificationRefusee) return refus(error.message);
    console.error("[test] échec de l'enregistrement du texte :", error);
    return refus("L'enregistrement a échoué et rien n'a été modifié. Réessaie.");
  }

  return {
    ok: true,
    simulation: false,
    versionSuivante: versionSuivante.toISOString(),
    analyseId: analyse.id,
    propositionId: analyse.propositionId,
    champ,
    avant,
    apres: lireValeur(contenu, champ),
  };
}
