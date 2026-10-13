import { MOTS_INTERDITS } from "./pseudos-interdits.js";
import { SESSION_EXPIREE } from "./relecture-comments-core.js";

// Pseudonyme des membres du Club : fonctions PURES (ni Next, ni base) pour
// pouvoir les tester avec `node --test` (scripts/club-pseudo.test.js). La
// route PATCH /api/relectures/moi leur fournit l'adhérent connecté et l'accès
// à la base.

// Nom affiché dans le Club : le pseudo s'il existe, sinon le nom par défaut
// (« Prénom + initiale »). Les e-mails, eux, utilisent toujours `nom`.
export function nomAffiche(adherent) {
  return adherent?.pseudo || adherent?.nom || null;
}

export const PSEUDO_MIN = 3;
export const PSEUDO_MAX = 24;

// Lettres (accents compris), chiffres, espace, tiret, point, souligné.
const CARACTERES_AUTORISES = /^[\p{L}\p{M}0-9 ._-]+$/u;

// Forme de comparaison : minuscules, sans accents, sans espaces ni - . _
// « Lé Pen » → « lepen ».
export function cleComparaison(texte) {
  return String(texte)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[\s._-]/g, "");
}

const CLES_INTERDITES = MOTS_INTERDITS.map(cleComparaison).filter(Boolean);

// Valide la saisie. Renvoie { pseudo } (null = revenir au nom par défaut)
// ou { error } avec un message prêt à afficher.
export function validerPseudo(saisie) {
  if (saisie === null || saisie === undefined) return { pseudo: null };
  if (typeof saisie !== "string") return { error: "Pseudo invalide." };

  // Espaces retirés au début et à la fin ; plusieurs espaces de suite
  // ramenés à un seul (« Camille   D. » = « Camille D. »).
  const pseudo = saisie.normalize("NFC").trim().replace(/\s+/g, " ");
  if (pseudo === "") return { pseudo: null };

  const longueur = [...pseudo].length;
  if (longueur < PSEUDO_MIN || longueur > PSEUDO_MAX) {
    return { error: `Le pseudo doit faire entre ${PSEUDO_MIN} et ${PSEUDO_MAX} caractères.` };
  }
  if (!CARACTERES_AUTORISES.test(pseudo)) {
    return { error: "Seuls les lettres, les chiffres, les espaces et les signes - . _ sont autorisés." };
  }
  const cle = cleComparaison(pseudo);
  if (CLES_INTERDITES.some((interdit) => cle.includes(interdit))) {
    return { error: "Ce pseudo n'est pas autorisé. Choisissez-en un autre." };
  }
  return { pseudo };
}

export const PSEUDO_DEJA_UTILISE = "Ce pseudo est déjà utilisé";

// Logique de PATCH /api/relectures/moi.
// - adherent : membre connecté (session), jamais un id envoyé par le navigateur ;
// - pseudoPris(pseudo, adherentId) : vrai si un AUTRE membre a déjà ce pseudo
//   (comparaison sans tenir compte des majuscules) ;
// - enregistrer(adherentId, pseudo) : écrit le pseudo (null = nom par défaut).
//   Peut lever une erreur Prisma P2002 si deux membres prennent le même pseudo
//   au même instant : on renvoie alors le même message « déjà utilisé ».
export async function modifierPseudo({ adherent, data, pseudoPris, enregistrer }) {
  if (!adherent) return { status: 401, body: SESSION_EXPIREE };
  if (!data || typeof data !== "object" || !("pseudo" in data)) {
    return { status: 400, body: { error: "Pseudo manquant." } };
  }

  const { pseudo, error } = validerPseudo(data.pseudo);
  if (error) return { status: 400, body: { error } };

  if (pseudo !== null && (await pseudoPris(pseudo, adherent.id))) {
    return { status: 409, body: { error: PSEUDO_DEJA_UTILISE } };
  }

  try {
    await enregistrer(adherent.id, pseudo);
  } catch (err) {
    if (err?.code === "P2002") return { status: 409, body: { error: PSEUDO_DEJA_UTILISE } };
    throw err;
  }

  return { status: 200, body: { pseudo, nomAffiche: nomAffiche({ nom: adherent.nom, pseudo }) } };
}
