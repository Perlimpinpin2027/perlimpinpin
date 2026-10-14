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

// « de {NOM} » devient « d’Édouard Philippe » devant une voyelle ou un h (pas
// devant un compte X : « de @… »).
export function remplirTweet(texte, valeurs) {
  return String(texte ?? "")
    .replace(/(^|[^\p{L}])(de|que) \{(NOM|CANDIDAT)\}/gu, (tout, avant, mot, nom) => {
      const valeur = valeurs[nom];
      if (typeof valeur !== "string" || !/^[aeiouyh]/i.test(valeur.normalize("NFD"))) return tout;
      return `${avant}${mot === "de" ? "d’" : "qu’"}${valeur}`;
    })
    .replace(/\{([A-Z]+)\}/g, (marqueur, nom) => valeurs[nom] ?? marqueur);
}

// Marqueurs obligatoires de chaque tweet. Le compte X ({CANDIDAT}) seulement
// dans le premier tweet de chaque format ; le nom sans @ ({NOM}) dans les
// tweets 2 à 4 du fil, pour ne pas notifier le candidat à chaque réponse.
export const MARQUEURS_PAR_TWEET = {
  "fil.0": ["CANDIDAT", "PASTILLE", "SCORE", "APPRECIATION"],
  "fil.1": ["NOM"],
  "fil.2": ["NOM"],
  "fil.3": ["NOM", "LIEN"],
  "chiffre.tweet": ["CANDIDAT", "PASTILLE", "SCORE", "LIEN"],
  "tient.tweet": ["CANDIDAT", "PASTILLE", "SCORE", "LIEN"],
};

// --- Parties variables et assemblage ---------------------------------------
// Le modèle n'écrit que les parties variables (voir data/prompt-reseaux.md) ;
// le code les assemble avec les parties fixes (formules, marqueurs, lien).
// Ce qui est enregistré dans contenuComplet.reseaux est le résultat assemblé,
// toujours avec ses marqueurs.

// Parties variables de chaque tweet (clé « format.partie »).
export const PARTIES_PAR_TWEET = {
  "fil.0": ["fil.accroche", "fil.suspense"],
  "fil.1": ["fil.tweet2"],
  "fil.2": ["fil.tweet3"],
  "fil.3": ["fil.angle_mort", "fil.point_solide"],
  "chiffre.tweet": ["chiffre.valeur", "chiffre.explication", "chiffre.mesure_courte"],
  "tient.tweet": ["tient.titre", "tient.tweet_tient", "tient.tweet_tient_pas"],
};

export function lirePartie(parties, cle) {
  const [format, champ] = cle.split(".");
  return parties?.[format]?.[champ];
}

export function ecrirePartie(parties, cle, valeur) {
  const copie = structuredClone(parties);
  const [format, champ] = cle.split(".");
  copie[format] = { ...copie[format], [champ]: valeur };
  return copie;
}

// Retire ce que le code ajoute lui-même, si le modèle l'a écrit quand même.
function nettoyer(texte, { debut = null, fin = null } = {}) {
  let t = String(texte ?? "").trim();
  if (debut) t = t.replace(debut, "").trim();
  if (fin) t = t.replace(fin, "").trim();
  return t;
}

// Parties normalisées (débuts « 2/ », flèche finale, point final… retirés).
export function normaliserParties(p) {
  return {
    fil: {
      accroche: nettoyer(p.fil.accroche, { debut: /^🔵\s*/u }),
      suspense: nettoyer(p.fil.suspense, { fin: /\s*↓\s*$/u }),
      tweet2: nettoyer(p.fil.tweet2, { debut: /^2\/\s*/ }),
      tweet3: nettoyer(p.fil.tweet3, { debut: /^3\/\s*/ }),
      angle_mort: nettoyer(p.fil.angle_mort, { debut: /^4\/\s*L[’']angle mort[^:]*:\s*/i }),
      point_solide: p.fil.point_solide ? nettoyer(p.fil.point_solide, { debut: /^Point solide\s*:\s*/i }) || null : null,
    },
    chiffre: {
      valeur: nettoyer(p.chiffre.valeur, { fin: /\.$/ }),
      explication: nettoyer(p.chiffre.explication),
      mesure_courte: nettoyer(p.chiffre.mesure_courte, { fin: /\.$/ }),
    },
    tient: {
      titre: nettoyer(p.tient.titre, { fin: /\.$/ }),
      tient: p.tient.tient.map((point) => nettoyer(point)),
      tient_pas: p.tient.tient_pas.map((point) => nettoyer(point)),
      tweet_tient: p.tient.tweet_tient.map((point) => nettoyer(point, { debut: /^✅\s*/u })),
      tweet_tient_pas: p.tient.tweet_tient_pas.map((point) => nettoyer(point, { debut: /^❌\s*/u })),
    },
  };
}

// Tweets assemblés (avec marqueurs) à partir des parties normalisées.
export function assemblerReseaux(p) {
  const blocs = (...morceaux) => morceaux.filter((m) => m !== null && m !== undefined).join("\n\n");
  return {
    fil: [
      blocs(
        `🔵 ${p.fil.accroche}`,
        "Perlimpinpin.ai analyse la proposition de {CANDIDAT}",
        "Note : {PASTILLE} {SCORE}/100 {APPRECIATION}",
        `${p.fil.suspense} ↓`,
      ),
      `2/ ${p.fil.tweet2}`,
      `3/ ${p.fil.tweet3}`,
      blocs(
        `4/ L’angle mort de la proposition de {NOM} : ${p.fil.angle_mort}`,
        p.fil.point_solide ? `Point solide : ${p.fil.point_solide}` : null,
        "Analyse complète 👇 {LIEN}",
      ),
    ],
    chiffre: {
      valeur: p.chiffre.valeur,
      explication: p.chiffre.explication,
      tweet: blocs(
        `${p.chiffre.valeur}. ${p.chiffre.explication}`,
        `{CANDIDAT} propose ${p.chiffre.mesure_courte}. Notre analyse : {PASTILLE} {SCORE}/100 👇 {LIEN}`,
      ),
    },
    tient: {
      titre: p.tient.titre,
      tient: p.tient.tient,
      tient_pas: p.tient.tient_pas,
      tweet: blocs(
        `${p.tient.titre}, la proposition de {CANDIDAT} : ce qui tient, ce qui ne tient pas.`,
        [...p.tient.tweet_tient.map((point) => `✅ ${point}`), ...p.tient.tweet_tient_pas.map((point) => `❌ ${point}`)].join("\n"),
        "{PASTILLE} {SCORE}/100 · Analyse complète 👇 {LIEN}",
      ),
    },
  };
}

// Budget en caractères de chaque partie variable, pour cette fiche : 280 moins
// les parties fixes remplies (nom ou compte X, appréciation, score, lien
// compté 23), puis réparti entre les parties du tweet. Pour les points du
// tweet « tient », budget PAR POINT (2 points de chaque côté au plus).
const PART_FIXE = { suspense: 80, point_solide: 60, valeur: 12, mesure_courte: 50, titre: 40 };

export function budgetsParties(valeurs) {
  const vides = {
    fil: { accroche: "", suspense: "", tweet2: "", tweet3: "", angle_mort: "", point_solide: "x" },
    chiffre: { valeur: "", explication: "", mesure_courte: "" },
    tient: { titre: "", tient: [], tient_pas: [], tweet_tient: ["", ""], tweet_tient_pas: ["", ""] },
  };
  const tweets = assemblerReseaux(vides);
  const reste = (texte, retrait = 0) => LONGUEUR_X_MAX - longueurX(remplirTweet(texte, valeurs)) + retrait;
  const fil0 = reste(tweets.fil[0]);
  const fil3 = reste(tweets.fil[3], 1); // le « x » du point solide vide
  const chiffre = reste(tweets.chiffre.tweet);
  const tient = reste(tweets.tient.tweet);
  return {
    "fil.accroche": fil0 - PART_FIXE.suspense,
    "fil.suspense": PART_FIXE.suspense,
    "fil.tweet2": reste(tweets.fil[1]),
    "fil.tweet3": reste(tweets.fil[2]),
    "fil.angle_mort": fil3 - PART_FIXE.point_solide,
    "fil.point_solide": PART_FIXE.point_solide,
    "chiffre.valeur": PART_FIXE.valeur,
    "chiffre.mesure_courte": PART_FIXE.mesure_courte,
    "chiffre.explication": chiffre - PART_FIXE.valeur - PART_FIXE.mesure_courte,
    "tient.titre": PART_FIXE.titre,
    "tient.tweet_tient": Math.floor((tient - PART_FIXE.titre) / 4),
    "tient.tweet_tient_pas": Math.floor((tient - PART_FIXE.titre) / 4),
  };
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
