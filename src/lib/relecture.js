// Statut calculé du chrono de relecture d'une fiche en brouillon (/relectures).
// Une fiche est "Relecture terminée · Prête à publier" dès que son échéance est
// passée (atteinte ou "Clore maintenant"). Cela ferme les commentaires et rien
// d'autre : pas de publication, pas de changement dans la table Analyse.

export function isRelectureClosed(fiche, now = new Date()) {
  return Boolean(fiche?.reviewDeadline) && fiche.reviewDeadline.getTime() <= now.getTime();
}

// "27 sept. 2026 à 14:32", à l'heure de Paris quel que soit le fuseau du serveur.
export function formatClosedAt(date) {
  const opts = { timeZone: "Europe/Paris" };
  const day = date.toLocaleDateString("fr-FR", { ...opts, day: "numeric", month: "short", year: "numeric" });
  const time = date.toLocaleTimeString("fr-FR", { ...opts, hour: "2-digit", minute: "2-digit" });
  return `${day} à ${time}`;
}
