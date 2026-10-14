import { test } from "node:test";
import assert from "node:assert/strict";
import { consigneBudgets, validatePartiesReseaux, validateReseaux } from "./lib/scoring.js";
import { buildCoutPipeline, fichePourReseaux } from "./analyze.js";
import {
  assemblerReseaux,
  budgetsParties,
  ecrirePartie,
  lienIntentionX,
  lirePartie,
  longueurX,
  minusculeInitiale,
  nombresSansAbreviation,
  pastille,
  remplirTweet,
  tweetsReseaux,
  valeursReseaux,
} from "../src/lib/reseaux.js";
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

// Parties variables conformes (ce que le modèle écrit désormais).
const partiesValides = () => ({
  fil: {
    accroche: "Supprimer les certificats d'économies d'énergie : une baisse non chiffrée.",
    suspense: "Un chiffre surprend",
    tweet2: "{NOM} veut supprimer un dispositif qui coûte 141 M€ par an (Cour des comptes).",
    tweet3: "Selon la fiche, 2,9 millions de ménages en bénéficient depuis 2021, ce que {NOM} ne mentionne pas.",
    angle_mort: "qui financera les travaux ?",
    point_solide: null,
  },
  chiffre: { valeur: "141 M€", explication: "Le coût annuel du dispositif que la mesure supprime.", mesure_courte: "de le supprimer" },
  tient: {
    titre: "Supprimer les certificats d'énergie",
    tient: [{ texte: "Le dispositif existe déjà et finance des travaux.", court: "Le dispositif existe déjà." }],
    tient_pas: [
      { texte: "La baisse annoncée n'est pas chiffrée.", court: "Baisse non chiffrée." },
      { texte: "Le financement des travaux reste flou.", court: "Financement des travaux flou." },
      { texte: "Aucune étude ne mesure l'effet sur la consommation.", court: "Effet non mesuré." },
    ],
  },
});

test("parties : le code assemble les parties fixes, la sortie assemblée est acceptée", () => {
  const resultat = validatePartiesReseaux(partiesValides(), contexte);
  assert.deepEqual(resultat.errors, []);
  const { fil, chiffre, tient } = resultat.reseaux;
  assert.equal(
    fil[0],
    "🔵 Supprimer les certificats d'économies d'énergie : une baisse non chiffrée.\n\nPerlimpinpin.ai analyse la proposition de {CANDIDAT}\n\nNote : {PASTILLE} {SCORE}/100 {APPRECIATION}\n\nUn chiffre surprend ↓",
  );
  assert.ok(fil[1].startsWith("2/ {NOM}") && fil[2].startsWith("3/ "));
  assert.equal(fil[3], "4/ L’angle mort de la proposition de {NOM} : qui financera les travaux ?\n\nAnalyse complète 👇 {LIEN}");
  assert.equal(chiffre.tweet, "141 M€. Le coût annuel du dispositif que la mesure supprime.\n\n{CANDIDAT} propose de le supprimer. Notre analyse : {PASTILLE} {SCORE}/100 👇 {LIEN}");
  assert.match(tient.tweet, /^Supprimer les certificats d'énergie, la proposition de \{CANDIDAT\} : ce qui tient, ce qui ne tient pas\.\n\n✅ Le dispositif existe déjà\.\n❌ Baisse non chiffrée\.\n❌ Financement des travaux flou\.\n\n\{PASTILLE\} \{SCORE\}\/100 · Analyse complète 👇 \{LIEN\}$/u);
  // L'image garde les `texte` (les 3) ; le tweet les `court` des 2 premiers ;
  // toutes les versions courtes sont enregistrées pour la relecture.
  assert.deepEqual(tient.tient_pas, partiesValides().tient.tient_pas.map((p) => p.texte));
  assert.deepEqual(tient.tient_pas_court, ["Baisse non chiffrée.", "Financement des travaux flou.", "Effet non mesuré."]);
  assert.ok(!tient.tweet.includes("Effet non mesuré"));
});

test("nettoyage : nombres abrégés, point avant ↓, minuscule après les deux-points", () => {
  assert.equal(nombresSansAbreviation("la moitié des 1,8M logements"), "la moitié des 1,8 million logements");
  assert.equal(nombresSansAbreviation("2,9M de ménages, 3 Md d'euros, 1Md"), "2,9 millions de ménages, 3 milliards d'euros, 1 milliard");
  assert.equal(nombresSansAbreviation("141 M€ et 2 Md€"), "141 M€ et 2 Md€");
  assert.equal(minusculeInitiale("Aucune compensation prévue."), "aucune compensation prévue.");
  assert.equal(minusculeInitiale("L'abrogation suffit."), "l'abrogation suffit.");
  assert.equal(minusculeInitiale("Marine Le Pen ne dit pas…"), "Marine Le Pen ne dit pas…");
  assert.equal(minusculeInitiale("HLM : rien."), "HLM : rien.");
  const p = partiesValides();
  p.fil.suspense = "La moitié a été bâtie sous contrainte. ↓";
  p.fil.angle_mort = "Aucune compensation pour les 1,8M logements.";
  p.fil.point_solide = "L'abrogation est simple.";
  const { reseaux } = validatePartiesReseaux(p, { candidatNom: "David Lisnard", score: 31 });
  assert.match(reseaux.fil[0], /sous contrainte ↓$/);
  assert.match(reseaux.fil[3], /: aucune compensation pour les 1,8 million logements\.\n\nPoint solide : l'abrogation est simple\./);
});

test("parties : ce que le code ajoute est retiré si le modèle l'écrit quand même", () => {
  const p = partiesValides();
  p.fil.accroche = `🔵 ${p.fil.accroche}`;
  p.fil.suspense = "Un chiffre surprend ↓";
  p.fil.tweet2 = `2/ ${p.fil.tweet2}`;
  p.fil.angle_mort = "4/ L'angle mort de la proposition de {NOM} : qui financera les travaux ?";
  p.fil.point_solide = "Point solide : le dispositif existe.";
  p.chiffre.mesure_courte = "de le supprimer.";
  p.tient.tient[0].court = "✅ Le dispositif existe déjà.";
  const { reseaux, errors } = validatePartiesReseaux(p, contexte);
  assert.deepEqual(errors, []);
  assert.equal(reseaux.fil[3], "4/ L’angle mort de la proposition de {NOM} : qui financera les travaux ?\n\nPoint solide : le dispositif existe.\n\nAnalyse complète 👇 {LIEN}");
  assert.ok(!reseaux.fil[0].includes("🔵 🔵") && !reseaux.fil[0].includes("↓ ↓") && !reseaux.fil[1].startsWith("2/ 2/"));
  assert.ok(reseaux.chiffre.tweet.includes("propose de le supprimer. Notre"));
});

test("budgets par partie : des parties remplies à leur budget tiennent en 280", () => {
  const valeurs = valeursReseaux({ candidatNom: "Marine Le Pen", score: 41 });
  const budgets = budgetsParties(valeurs);
  assert.ok(Object.values(budgets).every((b) => Number.isInteger(b) && b > 10));
  const plein = (n) => "a".repeat(n);
  const p = {
    fil: {
      accroche: plein(budgets["fil.accroche"]), suspense: plein(budgets["fil.suspense"]), tweet2: plein(budgets["fil.tweet2"]),
      tweet3: plein(budgets["fil.tweet3"]), angle_mort: plein(budgets["fil.angle_mort"]), point_solide: plein(budgets["fil.point_solide"]),
    },
    chiffre: { valeur: plein(12), explication: plein(budgets["chiffre.explication"]), mesure_courte: plein(budgets["chiffre.mesure_courte"]) },
    tient: {
      titre: plein(budgets["tient.titre"]),
      tient: [0, 1].map(() => ({ texte: "a", court: plein(Math.floor(budgets["tient.court"] / 4)) })),
      tient_pas: [0, 1].map(() => ({ texte: "a", court: plein(Math.floor(budgets["tient.court"] / 4)) })),
    },
  };
  for (const tweet of tweetsReseaux(assemblerReseaux(p), { ...valeurs, LIEN: "https://perlimpinpin.ai/declarations/38" })) {
    assert.ok(tweet.longueur <= 280, `${tweet.cle} : ${tweet.longueur}`);
    assert.ok(tweet.longueur >= 270, `${tweet.cle} : budget trop prudent (${tweet.longueur})`);
  }
  const consigne = consigneBudgets({ candidatNom: "Marine Le Pen", score: 41 });
  assert.match(consigne, /- tient : \d+ caractères au total pour les `court`/);
  assert.match(consigne, /Chaque \{NOM\} que tu écris compte pour 13 caractères/);
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

test("raccourcissement : proposé quand les seules erreurs sont des longueurs ou des nombres de mots", () => {
  const r = valide();
  r.fil[1] = `2/ {NOM} ${"mot ".repeat(80)}`.trim();
  const seul = validateReseaux(r, contexte);
  assert.equal(seul.seulementRaccourcir, true);
  assert.deepEqual(seul.tropLongs.map((t) => t.cle), ["fil.1"]);
  assert.ok(seul.tropLongs[0].excedent > 0 && seul.tropLongs[0].texte.startsWith("2/ {NOM}"));
  // Trop de mots : encore mécanique, avec la partie et le maximum à respecter.
  r.tient.titre = "Un titre beaucoup trop long pour la carte";
  const mots = validateReseaux(r, contexte);
  assert.equal(mots.seulementRaccourcir, true);
  assert.deepEqual(mots.tropDeMots, [{ partie: "tient.titre", max: 6 }]);
  // Un marqueur manquant n'est pas mécanique : nouvel essai complet.
  r.fil[2] = r.fil[2].replace("{NOM}", "la candidate");
  assert.equal(validateReseaux(r, contexte).seulementRaccourcir, false);
});

test("raccourcissement : parties en cause (caractères et mots), écriture sans effet de bord", () => {
  const p = partiesValides();
  p.fil.tweet2 = `{NOM} ${"mot ".repeat(80)}`.trim();
  p.fil.suspense = "Un chiffre de la fiche surprend beaucoup plus que tout le reste du dossier";
  p.tient.tient_pas[1].court = "Le financement des travaux de rénovation reste encore très flou.";
  p.tient.tient_pas[2].texte = `Aucune étude ne mesure ${"vraiment ".repeat(15)}l'effet.`;
  const resultat = validatePartiesReseaux(p, contexte);
  const parTweet = Object.fromEntries(resultat.tropLongs.map((t) => [t.cle, t.parties]));
  assert.deepEqual(parTweet["fil.1"], ["fil.tweet2"]);
  assert.equal(resultat.seulementRaccourcir, true);
  assert.deepEqual(
    resultat.tropDeMots.map((t) => `${t.partie}≤${t.max}`).sort(),
    ["fil.suspense≤12", "tient.courts_tient_pas≤8", "tient.textes_tient_pas≤15"],
  );
  const copie = ecrirePartie(p, "fil.tweet2", "{NOM} court.");
  assert.equal(lirePartie(copie, "fil.tweet2"), "{NOM} court.");
  assert.notEqual(lirePartie(p, "fil.tweet2"), "{NOM} court.");
  // Versions courtes et textes des points : lus et réécrits en liste, l'un sans toucher à l'autre.
  const q = partiesValides();
  assert.deepEqual(lirePartie(q, "tient.courts_tient_pas"), ["Baisse non chiffrée.", "Financement des travaux flou.", "Effet non mesuré."]);
  const r2 = ecrirePartie(q, "tient.courts_tient_pas", ["Baisse floue.", "Travaux flous.", "Effet inconnu."]);
  assert.deepEqual(r2.tient.tient_pas.map((x) => x.court), ["Baisse floue.", "Travaux flous.", "Effet inconnu."]);
  assert.equal(r2.tient.tient_pas[0].texte, q.tient.tient_pas[0].texte);
  const r3 = ecrirePartie(q, "tient.textes_tient", ["L'abrogation est simple."]);
  assert.equal(r3.tient.tient[0].texte, "L'abrogation est simple.");
  assert.equal(r3.tient.tient[0].court, q.tient.tient[0].court);
  assert.equal(q.tient.tient_pas[0].court, "Baisse non chiffrée.");
});
