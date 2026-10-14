import { test } from "node:test";
import assert from "node:assert/strict";
import { consigneBudgets, validatePartiesReseaux, validateReseaux } from "./lib/scoring.js";
import { buildCoutPipeline, fichePourReseaux, reglesCommunes } from "./analyze.js";
import {
  assemblerReseaux,
  avertissementsReseaux,
  budgetsParties,
  ecrirePartie,
  lienIntentionX,
  lirePartie,
  longueurX,
  mentionneCandidat,
  minusculeInitiale,
  nombresColles,
  normaliserParties,
  retirerUnPointDuTweet,
  espaceAvantPourcent,
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

test("étape 3 ter : « fragile » au sens courant n'est pas pris pour l'appréciation", () => {
  const r = valide();
  r.fil[3] = r.fil[3].replace("qui financera les travaux ?", "un financement fragile.");
  assert.deepEqual(validateReseaux(r, contexte).errors, []);
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

test("minuscule après les deux-points : sauf sigle ou nom propre ; espace avant %", () => {
  assert.equal(minusculeInitiale("Abroger la loi par voie ordinaire suffit."), "abroger la loi par voie ordinaire suffit.");
  assert.equal(minusculeInitiale("Marine Le Pen ne chiffre pas."), "Marine Le Pen ne chiffre pas.");
  assert.equal(minusculeInitiale("HLM : rien."), "HLM : rien.");
  assert.equal(minusculeInitiale("L'abrogation suffit."), "l'abrogation suffit.");
  assert.equal(espaceAvantPourcent("20 à 25% des logements, 30 %"), "20 à 25 % des logements, 30 %");
});

test("titre « tient » : celui de la fiche s'il fait 40 caractères au plus, sinon celui du modèle", () => {
  const p = partiesValides();
  const court = validatePartiesReseaux(p, { ...contexte, titreFiche: "Abroger la loi SRU" });
  assert.equal(court.reseaux.tient.titre, "Abroger la loi SRU");
  assert.equal(court.reseaux.tient.titre_source, "fiche");
  assert.match(court.reseaux.tient.tweet, /^Abroger la loi SRU, la proposition de/);
  // Titre de la fiche de plus de 6 mots mais de 40 caractères au plus : accepté.
  const mots = validatePartiesReseaux(p, { ...contexte, titreFiche: "Un titre de fiche de sept mots" });
  assert.deepEqual(mots.errors, []);
  const long = validatePartiesReseaux(p, { ...contexte, titreFiche: "Abroger la loi SRU sur les logements sociaux" });
  assert.equal(long.reseaux.tient.titre, p.tient.titre);
  assert.equal(long.reseaux.tient.titre_source, "modele");
  assert.ok(avertissementsReseaux(long.reseaux).some((a) => a.cle === "tient.titre"));
});

test("dernier recours : un point retiré du tweet « tient », au moins 1 de chaque côté, l'image garde tout", () => {
  const p = normaliserParties(partiesValides()); // 1 ✅, 3 ❌ (2 dans le tweet)
  const replie = retirerUnPointDuTweet(p);
  assert.deepEqual(replie.tient.dans_le_tweet, { tient: 1, tient_pas: 1 });
  assert.equal(retirerUnPointDuTweet(replie), null);
  const assemble = assemblerReseaux(replie).tient;
  assert.equal((assemble.tweet.match(/❌/gu) ?? []).length, 1);
  assert.equal(assemble.tient_pas.length, 3);
  assert.equal(assemble.points_retires, 1);
  assert.ok(avertissementsReseaux({ tient: assemble }).some((a) => a.message.includes("1 point(s) retiré(s)")));
  // À égalité (2 et 2), le côté dont la 2e version courte est la plus longue.
  const egal = structuredClone(p);
  egal.tient.tient.push({ texte: "Un second point.", court: "Un second point nettement plus long que l'autre." });
  assert.deepEqual(retirerUnPointDuTweet(egal).tient.dans_le_tweet, { tient: 1, tient_pas: 2 });
});

test("avertissements : version courte sans sujet, nombres côte à côte (hors milliers)", () => {
  const reseaux = {
    fil: ["2/ La loi impose depuis 2000 20 à 25 % de logements, dans 1 100 communes."],
    tient: {
      titre: "x",
      tient: [],
      tient_pas: [],
      tient_court: ["L'abrogation est simple.", "Marine Le Pen ne chiffre rien.", "HLM sans compensation."],
      tient_pas_court: ["Retire un levier qui faisait construire.", "Aucune compensation prévue."],
      tweet: "",
    },
  };
  const messages = avertissementsReseaux(reseaux).map((a) => `${a.cle} ${a.message}`);
  assert.deepEqual(messages.filter((m) => m.includes("sans sujet")), [
    "tient.tient_pas_court.0 Version courte sans sujet apparent : « ❌ Retire un levier qui faisait construire. ».",
  ]);
  assert.deepEqual(nombresColles("depuis 2000 20 à 25 %, dans 1 100 communes, 2 900 000 ménages"), ["2000 20"]);
  assert.ok(messages.some((m) => m.startsWith("fil.0 Deux nombres côte à côte : « 2000 20 »")));
});

test("règles communes du prompt, redonnées aux passes de raccourcissement", async () => {
  const { readFileSync } = await import("node:fs");
  const prompt = readFileSync(new URL("../data/prompt-reseaux.md", import.meta.url), "utf8").replace(/\r\n/g, "\n");
  const regles = reglesCommunes(prompt);
  assert.ok(regles.startsWith("Règles communes"));
  assert.ok(regles.includes("Jamais deux nombres côte à côte") && regles.includes("Il ou Elle"));
  assert.ok(!regles.includes("Format 1"));
});

test("avertissements sans refus : mots, compte X, note, pastille ou appréciation écrits à la main", () => {
  const r = valide();
  r.fil[0] = r.fil[0].replace("Un chiffre surprend ↓", "Un chiffre de la fiche surprend beaucoup plus que tout le reste du dossier présenté ici ↓");
  r.fil[1] = "2/ {NOM} et {CANDIDAT} : une mesure à 31/100, Partiellement fondé 🟠, selon @quelquun.";
  r.tient.titre = "Un titre beaucoup trop long pour la carte";
  r.chiffre.explication = `Le coût ${"annuel ".repeat(20)}du dispositif.`;
  r.tient.tient_court = ["Le dispositif existe déjà depuis longtemps dans tout le pays entier."];
  // Seul refus : les nombres de « 31/100 », absents de la fiche. Ni les mots, ni
  // le compte X, ni la pastille, ni l'appréciation ne bloquent.
  assert.deepEqual(
    validateReseaux(r, contexte).errors.map((e) => e.match(/« (\d+) »/)?.[1]),
    ["31", "100"],
  );
  const messages = avertissementsReseaux(r).map((a) => `${a.cle} | ${a.message}`);
  for (const attendu of [
    "fil.0 (suspense) | 16 mots (15 conseillés)",
    "tient.titre | 8 mots (6 conseillés)",
    "chiffre.explication | 24 mots (20 conseillés)",
    "tient.tient (court) | 11 mots (10 conseillés)",
    "fil.1 | Compte X écrit à la main",
    "fil.1 | Compte X dans une réponse du fil",
    "fil.1 | Note sur 100 écrite à la main",
    "fil.1 | Pastille écrite à la main",
    "fil.1 | Appréciation « Partiellement fondé » écrite à la main",
  ]) {
    assert.ok(messages.some((m) => m.startsWith(attendu)), `manque : ${attendu}\n${messages.join("\n")}`);
  }
  // Titre venu de la fiche : pas d'avertissement de mots.
  assert.ok(!avertissementsReseaux({ tient: { titre: "Un titre de fiche de sept mots", titre_source: "fiche" } }).some((a) => a.cle === "tient.titre"));
});

test("repli du tweet « tient » avant le contrôle final : point retiré, puis en-tête court", () => {
  // Un nom très long fait déborder le tweet « tient » même avec 1 point de chaque côté.
  const p = partiesValides();
  p.tient.tient.push({ texte: "Un second point.", court: "Un second point qui tient, assez long pour compter." });
  p.tient.tient_pas = p.tient.tient_pas.map((x) => ({ ...x, court: `${x.court} ${"Encore des précisions utiles. ".repeat(2)}`.trim() }));
  const resultat = validatePartiesReseaux(p, { ...contexte, candidatNom: "David Lisnard", score: 31 });
  const tient = resultat.assemble.tient;
  assert.ok(tient.points_retires >= 1);
  assert.ok(!resultat.errors.some((e) => e.startsWith("tient.tweet")), resultat.errors.join("\n"));
  // Toujours trop long avec 1 point de chaque côté : en-tête sans « la proposition de ».
  const q = partiesValides();
  q.tient.tient[0].court = `Le dispositif ${"existe ".repeat(18)}`.trim();
  const court = validatePartiesReseaux(q, { ...contexte, candidatNom: "David Lisnard", score: 31 });
  assert.equal(court.assemble.tient.entete_court, true);
  assert.match(court.assemble.tient.tweet, /^Supprimer les certificats d'énergie, \{CANDIDAT\} : ce qui tient/);
  assert.ok(avertissementsReseaux(court.assemble).some((a) => a.message.startsWith("En-tête raccourci")));
  // Assez court : ni point retiré, ni en-tête court.
  const normal = validatePartiesReseaux(partiesValides(), contexte).assemble.tient;
  assert.ok(!normal.points_retires && !normal.entete_court);
});


test("refus : seulement nombre absent de la fiche et tiret cadratin (le JSON invalide est refusé par le schéma)", () => {
  const tiret = valide();
  tiret.tient.tient[0] = "Le dispositif existe — déjà.";
  assert.ok(validateReseaux(tiret, contexte).errors.some((e) => e.includes("tiret cadratin")));
  const nombre = valide();
  nombre.fil[1] = "2/ {NOM} veut supprimer un dispositif qui coûte 500 M€ par an.";
  assert.ok(validateReseaux(nombre, contexte).errors.some((e) => e.includes("« 500 »")));
  assert.equal(validatePartiesReseaux({ fil: "pas du bon format" }, contexte).valid, false);
  // Tweet trop long : accepté, mais signalé (tropLongs) pour le raccourcissement.
  const long = valide();
  long.fil[1] = `2/ {NOM} ${"mot ".repeat(80)}`.trim();
  const v = validateReseaux(long, contexte);
  assert.equal(v.valid, true);
  assert.deepEqual(v.tropLongs.map((t) => t.cle), ["fil.1"]);
  // Candidat non nommé : accepté aussi.
  const sansNom = valide();
  sansNom.fil[2] = "3/ Selon la fiche, 2,9 millions de ménages en bénéficient depuis 2021.";
  assert.equal(validateReseaux(sansNom, contexte).valid, true);
});

test("avertissements : tweet trop long (fort), candidat non nommé ; nom complet ou nom de famille acceptés", () => {
  const valeurs = valeursReseaux({ candidatNom: "Marine Le Pen", score: 41, propositionId: 38 });
  const r = valide();
  r.fil[1] = `2/ {NOM} ${"mot ".repeat(80)}`.trim();
  r.fil[2] = "3/ Selon la fiche, 2,9 millions de ménages en bénéficient depuis 2021.";
  const avertissements = avertissementsReseaux(r, { valeurs });
  const fort = avertissements.find((a) => a.cle === "fil.1" && a.fort);
  assert.match(fort.message, /caractères comptés par X \(280 au plus\) : à raccourcir avant de poster/);
  assert.ok(avertissements.some((a) => a.cle === "fil.2" && a.message.startsWith("Le candidat n'est pas nommé")));
  // Nom complet, nom de famille (avec ou sans particule, sans accents) : pas d'avertissement.
  assert.equal(mentionneCandidat("3/ Pour Marine Le Pen, la loi…", "Marine Le Pen"), true);
  assert.equal(mentionneCandidat("3/ Pour Le Pen, la loi…", "Marine Le Pen"), true);
  assert.equal(mentionneCandidat("3/ Selon Melenchon…", "Jean-Luc Mélenchon"), true);
  assert.equal(mentionneCandidat("3/ Pour Villepin…", "Dominique de Villepin"), true);
  assert.equal(mentionneCandidat("3/ {NOM} affirme…", "Marine Le Pen"), true);
  assert.equal(mentionneCandidat("3/ La candidate affirme…", "Marine Le Pen"), false);
  r.fil[2] = "3/ Selon Le Pen, 2,9 millions de ménages en bénéficient depuis 2021.";
  assert.ok(!avertissementsReseaux(r, { valeurs }).some((a) => a.cle === "fil.2"));
});

test("raccourcissement : parties du tweet trop long, écriture des points sans effet de bord", () => {
  const p = partiesValides();
  p.fil.tweet2 = `{NOM} ${"mot ".repeat(80)}`.trim();
  const resultat = validatePartiesReseaux(p, contexte);
  assert.equal(resultat.valid, true);
  assert.deepEqual(resultat.tropLongs.map((t) => [t.cle, t.parties]), [["fil.1", ["fil.tweet2"]]]);
  const q = partiesValides();
  assert.deepEqual(lirePartie(q, "tient.courts_tient_pas"), ["Baisse non chiffrée.", "Financement des travaux flou.", "Effet non mesuré."]);
  const r2 = ecrirePartie(q, "tient.courts_tient_pas", ["Baisse floue.", "Travaux flous.", "Effet inconnu."]);
  assert.deepEqual(r2.tient.tient_pas.map((x) => x.court), ["Baisse floue.", "Travaux flous.", "Effet inconnu."]);
  assert.equal(r2.tient.tient_pas[0].texte, q.tient.tient_pas[0].texte);
  assert.equal(q.tient.tient_pas[0].court, "Baisse non chiffrée.");
});
