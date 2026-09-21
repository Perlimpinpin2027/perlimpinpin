// Portée des listes de /live (historique, analyses récentes, dossiers, recherche) :
// « Mes analyses » (par défaut) ou « Toutes les analyses » de l'équipe. Les favoris sont
// toujours personnels et ne dépendent pas de ce choix.
//
// Le choix est mémorisé dans un cookie de simple préférence d'affichage (aucun secret) ;
// les listes sont lues côté serveur, qui l'applique à chaque requête.

export const SCOPE_COOKIE_NAME = "live_portee";
export const SCOPES = ["mes", "toutes"];
export const DEFAULT_SCOPE = "mes";

export const SCOPE_LABELS = { mes: "Mes analyses", toutes: "Toutes les analyses" };

// Analyses créées avant les comptes individuels : aucun auteur enregistré
export const LEGACY_AUTHOR_LABEL = "Équipe éditoriale (historique)";

// Valeur inconnue ou absente => « mes » (la vue la plus restrictive).
export function normalizeScope(value) {
  return value === "toutes" ? "toutes" : DEFAULT_SCOPE;
}

// Filtre Prisma correspondant à la portée. Un identifiant de journaliste valide est
// EXIGÉ : sans lui, « Mes analyses » ne doit jamais retomber sur « toutes ».
export function scopeWhere(scope, userId) {
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error("Identifiant de journaliste requis pour lister les analyses.");
  }
  return normalizeScope(scope) === "toutes" ? {} : { auteurId: userId };
}

// Libellé d'auteur affiché sur une analyse
export function authorLabel(auteur) {
  return auteur?.nom ? auteur.nom : LEGACY_AUTHOR_LABEL;
}
