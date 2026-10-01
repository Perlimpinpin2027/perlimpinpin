// Textes modifiables des pages publiques du site.
//
// Chaque page a son fichier dans src/lib/textes/ : une liste de « champs »
// avec une clé unique, un groupe (titre de rubrique dans la page d'édition),
// un libellé et le texte par défaut. Dans un texte, un retour à la ligne (\n)
// = un nouveau paragraphe.
//
// Un texte enregistré en base (table TexteSite) remplace le texte par défaut.
// Si la base est vide ou injoignable, le texte par défaut s'affiche : la page
// ne peut jamais se retrouver vide. Ce fichier n'accède PAS à la base, il peut
// donc aussi être importé par des composants client.
//
// Pour ajouter une page : créer src/lib/textes/<page>.js puis l'ajouter
// ci-dessous (l'ordre ici = l'ordre de la liste sur /test/textes).

import accueil from "@/lib/textes/accueil";
import nousRejoindre from "@/lib/textes/nous-rejoindre";
import aPropos from "@/lib/textes/a-propos";

export const PAGES_EDITABLES = {
  accueil,
  "a-propos": aPropos,
  "nous-rejoindre": nousRejoindre,
};

// Les textes par défaut d'une page, sous la forme { clé: texte }.
export function textesParDefaut(page) {
  const definition = PAGES_EDITABLES[page];
  if (!definition) throw new Error(`Page modifiable inconnue : ${page}`);
  const textes = {};
  for (const champ of definition.champs) textes[champ.cle] = champ.defaut;
  return textes;
}

// Découpe un texte en paragraphes (une ligne = un paragraphe, lignes vides ignorées).
export function enLignes(texte) {
  return String(texte ?? "")
    .split("\n")
    .map((ligne) => ligne.trim())
    .filter(Boolean);
}

// La lecture des textes (base + textes par défaut) est dans
// src/lib/textes-site-serveur.js.

// Longueur maximale d'un texte (garde-fou contre un collage accidentel).
export const TEXTE_SITE_MAX = 3000;

// Nettoyage avant enregistrement : retours à la ligne Windows unifiés, espaces
// en trop au début et à la fin retirés, pas plus d'une ligne vide d'affilée.
export function normaliserTexteSite(texte) {
  return String(texte ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Vérifie un texte (déjà normalisé) avant enregistrement.
export function validerTexteSite(texte) {
  if (!texte) return { ok: false, message: "Le texte ne peut pas être vide." };
  if (texte.length > TEXTE_SITE_MAX) {
    return { ok: false, message: `Texte trop long (${TEXTE_SITE_MAX} caractères maximum).` };
  }
  return { ok: true };
}
