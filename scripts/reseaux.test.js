import { test } from "node:test";
import assert from "node:assert/strict";
import { consigneBudgets, remplacerTweet, validateReseaux } from "./lib/scoring.js";
import { buildCoutPipeline, fichePourReseaux } from "./analyze.js";
import { budgetsReseaux, lienIntentionX, longueurX, pastille, remplirTweet, tweetsReseaux, valeursReseaux } from "../src/lib/reseaux.js";
import { HANDLES_X, handleX } from "../src/lib/handles-x.js";

const fiche = {
  titre_fiche: "Supprimer les certificats d'économies d'énergie",
  analyse: "Le dispositif coûte 141 M€ par an. 2,9 millions de ménages sont concernés depuis 2021.",
  verdict_final: "Ce qui tient : le dispositif existe. Ce qui ne tient pas : la baisse n'est pas chiffrée.",
};

const valide = () => ({
  fil: [
    "🔵 Supprimer les certificats d'économies d'énergie : une baisse non chiffrée.\n\nPerlimpinpin.ai analyse la proposition de {CANDIDAT}\n\nNote : {PASTILLE} {SCORE}/100 {APPRECIATION}\n\nUn chiffre surprend ↓",
    "2/ {NOM} veut supprimer un dispositif qui coûte 141 M€ par an (Cour des comptes).",
    "3/ Selon la fiche, 2,9 millions de ménages en bénéficient depuis 2021, ce que {NOM} ne mentionne pas.",
    "4/ L’angle mort de la proposition de {NOM} : qui financera les travaux ?\n\nAnalyse complète 👇\n{LIEN}",
  ],
  chiffre: {
    valeur: "141 M€",
    explication: "Le coût annuel du dispositif que la mesure supprime.",
    tweet: "141 M€. Le coût annuel du dispositif que la mesure supprime.\n\n{CANDIDAT} propose de le supprimer. Notre analyse : {PASTILLE} {SCORE}/100 👇\n{LIEN}",
  },
  tient: {
    titre: "Supprimer les certificats d'énergie",
    tient: ["Le dispositif existe déjà."],
    tient_pas: ["La baisse annoncée n'est pas chiffrée.", "Le financement des travaux reste flou."],
    tweet: "Supprimer les certificats d'énergie, la proposition de {CANDIDAT} : ce qui tient, ce qui ne tient pas.\n\n✅ Le dispositif existe déjà.\n❌ La baisse annoncée n'est pas chiffrée.\n❌ Le financement des travaux reste flou.\n\n{PASTILLE} {SCORE}/100 · Analyse complète 👇\n{LIEN}",
  },
});
const contexte = { ficheFinale: fiche, candidatNom: "David Lisnard", score: 31 };

test("longueur comptée par X : liens 23, emoji 2, € et … 2, accents 1", () => {
  assert.equal(longueurX("abc"), 3);
  assert.equal(longueurX("é’«»"), 4);
  assert.equal(longueurX("🔵"), 2);
  assert.equal(longueurX("€…"), 4);
  assert.equal(longueurX("https://perlimpinpin.ai/declarations/56"), 23);
  assert.equal(longueurX("Perlimpinpin.ai analyse"), 23 + " analyse".length);
  assert.equal(longueurX("👍🏽"), 2); // emoji avec modificateur : un seul emoji
});

test("marqueurs remplis par le code : compte X ou nom, pastille, score, lien", () => {
  const valeurs = valeursReseaux({ candidatNom: "David Lisnard", score: 31, propositionId: 56, handles: {} });
  assert.equal(valeurs.CANDIDAT, "David Lisnard"); // pas de compte : le nom, sans @
  assert.equal(valeurs.PASTILLE, "🔴");
  assert.equal(valeurs.APPRECIATION, "Fragile");
  assert.equal(remplirTweet("{CANDIDAT} {SCORE}/100 {LIEN}", valeurs), "David Lisnard 31/100 https://perlimpinpin.ai/declarations/56");
  const avecCompte = valeursReseaux({ candidatNom: "David Lisnard", score: 60, handles: { "David Lisnard": "davidlisnard" } });
  assert.equal(avecCompte.CANDIDAT, "@davidlisnard");
  assert.equal(avecCompte.NOM, "David Lisnard");
  assert.deepEqual([pastille(40), pastille(60), pastille(80)], ["🟠", "🟡", "🟢"]);
});

test("compte X : retrouvé sans tenir compte des accents, refusé s'il est mal formé", () => {
  assert.equal(handleX("Edouard Philippe", { "Édouard Philippe": "@exemple" }), "@exemple");
  assert.equal(handleX("Édouard Philippe", { "Édouard Philippe": null }), null);
  assert.equal(handleX("X", { X: "pas un compte !" }), null);
});

test("tweets d'une fiche : 6 tweets remplis, lien « Ouvrir dans X » encodé", () => {
  const tweets = tweetsReseaux(valide(), valeursReseaux({ candidatNom: "David Lisnard", score: 31, propositionId: 56 }));
  assert.deepEqual(tweets.map((t) => t.cle), ["fil.0", "fil.1", "fil.2", "fil.3", "chiffre.tweet", "tient.tweet"]);
  assert.ok(tweets.every((t) => !/\{[A-Z]+\}/.test(t.texte) && t.longueur <= 280));
  assert.match(lienIntentionX("a b&c"), /text=a%20b%26c$/);
});

test("étape 3 ter : une sortie conforme est acceptée", () => {
  const resultat = validateReseaux(valide(), contexte);
  assert.deepEqual(resultat.errors, []);
  assert.equal(resultat.valid, true);
});

test("étape 3 ter : chaque tweet doit mentionner le candidat", () => {
  const r = valide();
  r.fil[2] = "3/ Selon la fiche, 2,9 millions de ménages en bénéficient depuis 2021.";
  r.tient.tweet = r.tient.tweet.replace("{CANDIDAT}", "le candidat");
  const { errors } = validateReseaux(r, contexte);
  assert.ok(errors.some((e) => e.startsWith("fil.2 : le marqueur {NOM} manque")));
  assert.ok(errors.some((e) => e.startsWith("tient.tweet : le marqueur {CANDIDAT} manque")));
});

test("étape 3 ter : pas de compte X dans les réponses du fil, ni de @ écrit à la main", () => {
  const r = valide();
  r.fil[1] = r.fil[1].replace("{NOM}", "{CANDIDAT} {NOM}");
  r.chiffre.tweet = r.chiffre.tweet.replace("{CANDIDAT}", "{CANDIDAT} @davidlisnard");
  const { errors } = validateReseaux(r, contexte);
  assert.ok(errors.some((e) => e.startsWith("fil.1 : {CANDIDAT}")));
  assert.ok(errors.some((e) => e.startsWith("chiffre.tweet : n'écris aucun compte X")));
});

test("étape 3 ter : score, appréciation, tiret cadratin, nombres et marqueurs sur les images", () => {
  const r = valide();
  r.fil[1] = "2/ {NOM} : une mesure à 31/100 — Partiellement fondé, pour 500 M€.";
  r.tient.tient[0] = "{NOM} s'appuie sur un dispositif existant.";
  const { errors } = validateReseaux(r, contexte);
  assert.ok(errors.some((e) => e.includes("note sur 100")));
  assert.ok(errors.some((e) => e.includes("« partiellement fondé »")));
  assert.ok(errors.some((e) => e.includes("tiret cadratin")));
  assert.ok(errors.some((e) => e.includes("« 500 »")));
  assert.ok(errors.some((e) => e.startsWith("tient.tient.0 : texte d'image")));
  // La numérotation « 2/ » du fil n'est pas un chiffre à vérifier.
  assert.ok(!errors.some((e) => e.includes("« 2 »")));
});

test("étape 3 ter : « fragile » au sens courant n'est pas pris pour l'appréciation", () => {
  const r = valide();
  r.fil[3] = r.fil[3].replace("qui financera les travaux ?", "un financement fragile.");
  assert.deepEqual(validateReseaux(r, contexte).errors, []);
});

test("étape 3 ter : longueur X et limites de mots", () => {
  const r = valide();
  r.fil[1] = `2/ {NOM} ${"mot ".repeat(80)}`;
  r.tient.titre = "Un titre beaucoup trop long pour la carte";
  r.chiffre.valeur = "141 millions d'euros";
  assert.equal(validateReseaux(r, contexte).valid, false);
  const sansValeur = { ...valide(), chiffre: { ...valide().chiffre } };
  delete sansValeur.chiffre.valeur;
  assert.ok(validateReseaux(sansValeur, contexte).errors.some((e) => e.startsWith("chiffre.valeur")));
  r.chiffre.valeur = "141 M€";
  const { errors } = validateReseaux(r, contexte);
  assert.ok(errors.some((e) => e.startsWith("fil.1 :") && e.includes("comptés par X")));
  assert.ok(errors.some((e) => e.startsWith("tient.titre : 8 mots")));
});

test("fiche envoyée au modèle : sans version basique, anciennes publications ni révision", () => {
  const envoyee = fichePourReseaux({ ...fiche, version_basique: {}, reseaux: {}, revision: {} });
  assert.deepEqual(Object.keys(envoyee), Object.keys(fiche));
});

test("coût : l'étape 3 ter s'ajoute seulement quand elle a tourné", () => {
  const usage3 = { input_tokens: 1_000_000, output_tokens: 0 };
  const sans = buildCoutPipeline({ usage2: null, usage3, usage3bis: {} });
  assert.ok(!("tokensEtape3ter" in sans) && !("etape3ter" in sans.coutEstimeParEtape));
  const avec = buildCoutPipeline({ usage2: null, usage3, usage3bis: {}, usage3ter: { input_tokens: 10_000, output_tokens: 1_000 } });
  assert.equal(avec.coutEstimeParEtape.etape3ter, 0.045);
  assert.equal(avec.coutEstimeTotal, Number((sans.coutEstimeTotal + 0.045).toFixed(4)));
});

test("tweet 1 : phrase de suspense de 12 mots au plus, terminée par ↓", () => {
  const r = valide();
  r.fil[0] = r.fil[0].replace("Un chiffre surprend ↓", "Un chiffre de la fiche surprend beaucoup plus que tout le reste du dossier ↓");
  assert.ok(validateReseaux(r, contexte).errors.some((e) => e.startsWith("fil.0 : phrase de suspense de 14 mots")));
  r.fil[0] = r.fil[0].replace(/\n\n[^\n]*↓$/, "");
  assert.ok(validateReseaux(r, contexte).errors.some((e) => e.includes("terminée par « ↓ »")));
});

test("tweet 4 : commence par « 4/ L’angle mort de la proposition de {NOM} »", () => {
  const r = valide();
  r.fil[3] = "4/ L'angle mort : {NOM} ne dit pas qui financera les travaux.\n\nAnalyse complète 👇\n{LIEN}";
  assert.ok(validateReseaux(r, contexte).errors.some((e) => e.startsWith("fil.3 : doit commencer")));
  r.fil[3] = "4/ L'angle mort de la proposition d’{NOM} : le financement.\n\nAnalyse complète 👇\n{LIEN}";
  assert.ok(!validateReseaux(r, contexte).errors.some((e) => e.startsWith("fil.3")));
});

test("tweet « tient » : 2 points de chaque côté au plus, 8 mots au plus, distincts de la carte", () => {
  const r = valide();
  r.tient.tweet = r.tient.tweet.replace("❌ Le financement des travaux reste flou.", "❌ Le financement des travaux reste flou.\n❌ Rien.");
  assert.ok(validateReseaux(r, contexte).errors.some((e) => e.includes("3 point(s) qui ne tiennent pas")));
  const long = valide();
  long.tient.tweet = long.tient.tweet.replace("✅ Le dispositif existe déjà.", "✅ Le dispositif existe déjà depuis longtemps dans tout le pays.");
  assert.ok(validateReseaux(long, contexte).errors.some((e) => e.startsWith("tient.tweet : 10 mots")));
  // Formulation du tweet différente de celle de la carte : acceptée.
  const court = valide();
  court.tient.tweet = court.tient.tweet.replace("✅ Le dispositif existe déjà.", "✅ Un dispositif déjà en place.");
  assert.deepEqual(validateReseaux(court, contexte).errors, []);
});

test("budgets hors marqueurs : 280 moins les valeurs insérées pour cette fiche", () => {
  const budgets = budgetsReseaux(valeursReseaux({ candidatNom: "Marine Le Pen", score: 41, handles: {} }));
  // {CANDIDAT} 13 + {PASTILLE} 2 + {SCORE} 2 + {APPRECIATION} « Partiellement fondé » 19
  assert.equal(budgets["fil.0"], 280 - 13 - 2 - 2 - 19);
  assert.equal(budgets["fil.3"], 280 - 13 - 23);
  assert.match(consigneBudgets({ candidatNom: "Marine Le Pen", score: 41 }), /- tient\.tweet : \d+ caractères hors \{CANDIDAT\}/);
});

test("élision : « de {NOM} » devient « d’Édouard Philippe », pas devant un compte X", () => {
  assert.equal(remplirTweet("la proposition de {NOM}", { NOM: "Édouard Philippe" }), "la proposition d’Édouard Philippe");
  assert.equal(remplirTweet("la proposition de {NOM}", { NOM: "Marine Le Pen" }), "la proposition de Marine Le Pen");
  assert.equal(remplirTweet("analyse la proposition de {CANDIDAT}", { CANDIDAT: "@EPhilippe_LH" }), "analyse la proposition de @EPhilippe_LH");
});

test("comptes X : renseignés pour les 11 candidats, au bon format", () => {
  for (const nom of Object.keys(HANDLES_X)) assert.match(handleX(nom), /^@\w{1,15}$/);
  assert.equal(handleX("Marine Le Pen"), "@MLP_officiel");
});

test("formule « Analyse complète 👇 » exigée dans le tweet 4 et le tweet « tient »", () => {
  const r = valide();
  r.tient.tweet = r.tient.tweet.replace("Analyse complète 👇", "Analyse 👇");
  assert.ok(validateReseaux(r, contexte).errors.some((e) => e.startsWith("tient.tweet : la formule « Analyse complète 👇 » manque")));
});

test("raccourcissement : proposé seulement quand les seules erreurs sont des longueurs", () => {
  const r = valide();
  r.fil[1] = `2/ {NOM} ${"mot ".repeat(80)}`.trim();
  const seul = validateReseaux(r, contexte);
  assert.equal(seul.seulementLongueur, true);
  assert.deepEqual(seul.tropLongs.map((t) => t.cle), ["fil.1"]);
  assert.ok(seul.tropLongs[0].excedent > 0 && seul.tropLongs[0].texte.startsWith("2/ {NOM}"));
  r.tient.titre = "Un titre beaucoup trop long pour la carte";
  assert.equal(validateReseaux(r, contexte).seulementLongueur, false);
  // remplacerTweet : copie modifiée, original intact.
  const corrige = remplacerTweet(r, "fil.1", "2/ {NOM} court.");
  assert.equal(corrige.fil[1], "2/ {NOM} court.");
  assert.notEqual(r.fil[1], corrige.fil[1]);
  assert.equal(remplacerTweet(r, "tient.tweet", "x").tient.tweet, "x");
});
