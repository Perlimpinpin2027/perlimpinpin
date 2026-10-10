import { isRelectureClosed } from "./relecture.js";
import { SLUG_PATTERN } from "./github.js";

export { SLUG_PATTERN };

// « Envoyer en révision » (/relectures, mode comité) : contrôles de la demande.
// Le déclenchement du workflow GitHub est dans src/lib/github.js.
// Logique sans Next.js ni Prisma : la route lui passe la fiche et le chrono
// (tests : scripts/relecture-revision.test.js).

// fiche : contenu de data/relectures/<slug>.json (null si absent).
// chrono : ligne RelectureFiche en base (null si jamais lancé).
// Renvoie { status, error } si la demande est refusée, sinon null.
export function verifierDemande({ ficheSlug, fiche, chrono, maintenant = new Date() }) {
  if (!SLUG_PATTERN.test(ficheSlug)) return { status: 400, error: "ficheSlug invalide." };
  if (!fiche?.relecture) return { status: 404, error: "Fiche introuvable." };
  if (fiche.relecture.archive) return { status: 409, error: "Fiche déjà archivée : révision déjà faite." };
  if (!isRelectureClosed(chrono, maintenant)) return { status: 409, error: "La relecture n'est pas close." };
  return null;
}
