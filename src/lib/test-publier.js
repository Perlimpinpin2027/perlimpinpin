// Logique de « Publier un brouillon » depuis /test/[id], SANS dépendance à Next ni
// à la vraie base : tout ce qu'elle utilise (contrôle d'accès, client Prisma,
// mode simulation) est passé en paramètre. Ça permet de la tester avec une fausse
// base (scripts/test-publier.test.js). Le câblage réel est dans src/app/test/actions.js.
//
// Reproduit EXACTEMENT scripts/publish.js : statut "publie", puis recalcul de
// Candidat.scoreMoyen (moyenne des scoreFaisabilite des analyses "publie").

const NON_AUTORISE = "Non autorisé.";

// Erreur « attendue » lancée à l'intérieur de la transaction pour l'annuler
// proprement, avec un message à montrer à l'utilisateur.
class PublicationRefusee extends Error {}

function refus(message) {
  return { ok: false, message };
}

export async function publierBrouillonCore(analyseId, { isEditor, prisma, dryRun }) {
  // 1. Accès : avant tout, sans toucher à la base.
  if (!(await isEditor())) return refus(NON_AUTORISE);

  // L'argument vient du navigateur : on ne lui fait pas confiance.
  if (typeof analyseId !== "number" || !Number.isInteger(analyseId) || analyseId <= 0) {
    return refus("Analyse introuvable.");
  }

  // 2. L'analyse existe et c'est un brouillon.
  const analyse = await prisma.analyse.findUnique({
    where: { id: analyseId },
    select: {
      id: true,
      statut: true,
      scoreFaisabilite: true,
      propositionId: true,
      proposition: {
        select: { candidatId: true, candidat: { select: { nom: true } } },
      },
    },
  });
  if (!analyse) return refus("Analyse introuvable.");
  if (analyse.statut !== "brouillon") {
    return refus("Cette analyse n'est pas un brouillon : elle ne peut pas être publiée.");
  }

  // 3. C'est bien la plus récente de sa mesure (celle que montre la fiche publique).
  const plusRecente = await prisma.analyse.findFirst({
    where: { propositionId: analyse.propositionId },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (plusRecente?.id !== analyse.id) {
    return refus(
      "Ce brouillon n'est pas l'analyse la plus récente de cette mesure : il ne peut pas être publié.",
    );
  }

  // 4. Pas de doublon publié pour la même mesure (cas non géré volontairement).
  const dejaPubliee = await prisma.analyse.findFirst({
    where: {
      propositionId: analyse.propositionId,
      statut: "publie",
      id: { not: analyse.id },
    },
    select: { id: true },
  });
  if (dejaPubliee) {
    return refus(
      "Une version publiée existe déjà pour cette mesure : dépublie-la d'abord (scripts/unpublish.js).",
    );
  }

  const { candidatId, candidat } = analyse.proposition;

  // 5. Simulation : on calcule la future moyenne, on n'écrit RIEN.
  if (dryRun) {
    const publiees = await prisma.analyse.findMany({
      where: { statut: "publie", proposition: { candidatId } },
      select: { scoreFaisabilite: true },
    });
    const somme = publiees.reduce((total, a) => total + a.scoreFaisabilite, 0);
    const moyenne = (somme + analyse.scoreFaisabilite) / (publiees.length + 1);
    return {
      ok: true,
      simulation: true,
      message: `[Simulation] Cette analyse serait publiée et la moyenne de ${candidat.nom} deviendrait ${Number(moyenne.toFixed(1))}/100.`,
    };
  }

  // 6. Vraie publication : les deux écritures dans une seule transaction, dans
  // le même ordre que scripts/publish.js. Si l'une échoue, aucune n'est gardée.
  try {
    const candidatMisAJour = await prisma.$transaction(async (tx) => {
      const { count } = await tx.analyse.updateMany({
        where: { id: analyse.id, statut: "brouillon" },
        data: { statut: "publie" },
      });
      // Quelqu'un l'a déjà publiée (ou modifiée) entre-temps : on annule.
      if (count !== 1) {
        throw new PublicationRefusee(
          "Ce brouillon vient d'être modifié par quelqu'un d'autre : rien n'a été publié. Recharge la page.",
        );
      }

      const { _avg } = await tx.analyse.aggregate({
        where: { statut: "publie", proposition: { candidatId } },
        _avg: { scoreFaisabilite: true },
      });

      return tx.candidat.update({
        where: { id: candidatId },
        data: { scoreMoyen: _avg.scoreFaisabilite ?? null },
      });
    });

    return {
      ok: true,
      simulation: false,
      analyseId: analyse.id,
      propositionId: analyse.propositionId,
      candidatNom: candidatMisAJour.nom,
    };
  } catch (error) {
    if (error instanceof PublicationRefusee) return refus(error.message);
    console.error("[test] échec de la publication :", error);
    return refus(
      "La publication a échoué et rien n'a été enregistré. Réessaie, ou publie avec scripts/publish.js.",
    );
  }
}
