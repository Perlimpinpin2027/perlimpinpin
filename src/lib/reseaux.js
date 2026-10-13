import { formatScore, getScoreBadge } from "./score.js";
import { handleX } from "./handles-x.js";

// Publications X d'une analyse (contenuComplet.reseaux, étape 3 ter du
// pipeline). Les textes sont enregistrés AVEC leurs marqueurs ({CANDIDAT},
// {NOM}, {PASTILLE}, {SCORE}, {APPRECIATION}, {LIEN}) et remplis seulement à
// l'affichage : le score, le compte X (src/lib/handles-x.js) et le lien sont
// donc toujours ceux du moment. Fonctions PURES, partagées par le pipeline
// (scripts/lib/scoring.js) et les pages /test.

export const MARQUEURS = ["CANDIDAT", "NOM", "PASTILLE", "SCORE", "APPRECIATION", "LIEN"];
export const LONGUEUR_X_MAX = 280;
export const URL_SITE = "https://perlimpinpin.ai";

const PASTILLES = {
  "red-dark": "🔴",
  red: "🔴",
  orange: "🟠",
  amber: "🟡",
  green: "🟢",
  "green-dark": "🟢",
};

export function pastille(score) {
  return PASTILLES[getScoreBadge(score).color] ?? "🟠";
}

export function lienAnalyse(propositionId) {
  return `${URL_SITE}/declarations/${propositionId}`;
}

// Valeurs des marqueurs pour une fiche. Sans propositionId (pendant le
// pipeline, avant l'enregistrement), un lien factice : X compte de toute
// façon chaque lien pour 23 caractères.
export function valeursReseaux({ candidatNom, score, propositionId = 0, handles }) {
  return {
    CANDIDAT: handleX(candidatNom, handles) ?? candidatNom,
    NOM: candidatNom,
    PASTILLE: pastille(score),
    SCORE: String(formatScore(score)),
    APPRECIATION: getScoreBadge(score).label,
    LIEN: lienAnalyse(propositionId),
  };
}

export function remplirTweet(texte, valeurs) {
  return String(texte ?? "").replace(/\{([A-Z]+)\}/g, (marqueur, nom) => valeurs[nom] ?? marqueur);
}

// Longueur comptée par X (règles de twitter-text) : tout lien compte 23, un
// domaine nu comme « Perlimpinpin.ai » aussi (X le transforme en lien), un
// emoji compte 2, et chaque caractère hors des plages « latines » aussi
// (€, …, ↓ comptent 2 ; é, «, ’ comptent 1).
const PLAGES_SIMPLES = [
  [0, 4351],
  [8192, 8205],
  [8208, 8223],
  [8242, 8247],
];
const segmenteur = new Intl.Segmenter("fr", { granularity: "grapheme" });

function poidsCaractere(codePoint) {
  return PLAGES_SIMPLES.some(([min, max]) => codePoint >= min && codePoint <= max) ? 1 : 2;
}

export function longueurX(texte) {
  let liens = 0;
  const sansLiens = String(texte ?? "")
    .replace(/https?:\/\/\S+/gi, () => {
      liens += 1;
      return "";
    })
    .replace(/\bperlimpinpin\.ai\b/gi, () => {
      liens += 1;
      return "";
    });
  let longueur = liens * 23;
  for (const { segment } of segmenteur.segment(sansLiens)) {
    if (/\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(segment)) longueur += 2;
    else for (const caractere of segment) longueur += poidsCaractere(caractere.codePointAt(0));
  }
  return longueur;
}

// Les 6 tweets d'une fiche, dans l'ordre de publication conseillé, marqueurs
// remplis. `reseaux` : contenuComplet.reseaux (déjà validé).
export function tweetsReseaux(reseaux, valeurs) {
  if (!reseaux) return [];
  return [
    ...(reseaux.fil ?? []).map((texte, index) => ({ format: "score", cle: `fil.${index}`, texte: remplirTweet(texte, valeurs) })),
    { format: "chiffre", cle: "chiffre.tweet", texte: remplirTweet(reseaux.chiffre?.tweet, valeurs) },
    { format: "tient", cle: "tient.tweet", texte: remplirTweet(reseaux.tient?.tweet, valeurs) },
  ].map((tweet) => ({ ...tweet, longueur: longueurX(tweet.texte) }));
}

// Lien « Ouvrir dans X », texte prérempli (l'image se joint à la main).
export function lienIntentionX(texte) {
  return `https://x.com/intent/post?text=${encodeURIComponent(texte)}`;
}
