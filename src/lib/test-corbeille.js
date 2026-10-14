// Logique de « Mettre à la corbeille » un brouillon depuis /test, SANS dépendance à
// Next ni à la vraie base : le contrôle d'accès, le client Prisma et le mode
// simulation sont passés en paramètre, pour la tester avec une fausse base
// (scripts/test-corbeille.test.js). Le câblage réel est dans src/app/test/actions.js.
//
// Rien n'est supprimé : l'analyse passe simplement du statut "brouillon" au statut
// "corbeille" (le site public ne lit que "publie", /test que "brouillon"). Les
// données liées (Feedback…) ne sont pas touchées.

const NON_AUTORISE = "Non autorisé.";

function refus(message) {
  return { ok: false, message };
}

export async function mettreALaCorbeilleCore(analyseId, { isEditor, prisma, dryRun }) {
  // 1. Accès : avant tout, sans toucher à la base.
  if (!(await isEditor())) return refus(NON_AUTORISE);

  // L'argument vient du navigateur : on ne lui fait pas confiance.
  if (typeof analyseId !== "number" || !Number.isInteger(analyseId) || analyseId <= 0) {
    return refus("Analyse introuvable.");
  }

  // 2. L'analyse existe et c'est un brouillon.
  const analyse = await prisma.analyse.findUnique({
    where: { id: analyseId },
    select: { id: true, statut: true, propositionId: true },
  });
  if (!analyse) return refus("Analyse introuvable.");
  if (analyse.statut === "publie") {
    return refus("Cette analyse est publiée : seuls les brouillons peuvent être mis à la corbeille.");
  }
  if (analyse.statut === "corbeille") return refus("Cette analyse est déjà à la corbeille.");
  if (analyse.statut !== "brouillon") {
    return refus("Cette analyse n'est pas un brouillon : elle ne peut pas être mise à la corbeille.");
  }

  if (dryRun) {
    return { ok: true, simulation: true, analyseId: analyse.id, propositionId: analyse.propositionId };
  }

  // 3. Écriture conditionnelle : le statut n'est changé que s'il est TOUJOURS
  // "brouillon" (si la fiche a été publiée entre-temps, rien n'est modifié).
  const { count } = await prisma.analyse.updateMany({
    where: { id: analyse.id, statut: "brouillon" },
    data: { statut: "corbeille" },
  });
  if (count !== 1) {
    return refus("Cette analyse a changé entre-temps (publiée ?) : rien n'a été modifié. Recharge la page.");
  }

  return { ok: true, analyseId: analyse.id, propositionId: analyse.propositionId };
}

// Inverse : remet un brouillon de la corbeille dans la liste de /test (statut
// "corbeille" -> "brouillon"). Pas de confirmation côté interface : on peut
// toujours le remettre à la corbeille ensuite.
export async function restaurerDepuisCorbeilleCore(analyseId, { isEditor, prisma, dryRun }) {
  if (!(await isEditor())) return refus(NON_AUTORISE);

  if (typeof analyseId !== "number" || !Number.isInteger(analyseId) || analyseId <= 0) {
    return refus("Analyse introuvable.");
  }

  const analyse = await prisma.analyse.findUnique({
    where: { id: analyseId },
    select: { id: true, statut: true, propositionId: true },
  });
  if (!analyse) return refus("Analyse introuvable.");
  if (analyse.statut !== "corbeille") return refus("Cette analyse n'est pas à la corbeille.");

  if (dryRun) {
    return { ok: true, simulation: true, analyseId: analyse.id, propositionId: analyse.propositionId };
  }

  const { count } = await prisma.analyse.updateMany({
    where: { id: analyse.id, statut: "corbeille" },
    data: { statut: "brouillon" },
  });
  if (count !== 1) {
    return refus("Cette analyse a changé entre-temps : rien n'a été modifié. Recharge la page.");
  }

  return { ok: true, analyseId: analyse.id, propositionId: analyse.propositionId };
}
