import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { appliquerCorrections, lireChemin, validerSortieCorrections } from "./lib/corrections-etape3.js";
import { recalculerNotation } from "./lib/scoring.js";
import { lignesModeEtape3, sectionCorrections } from "./lib/revision-relecture.js";
import { buildCoutPipeline, construireRequeteEtape3, gabaritSansFormat, messageCorrectionEtape3 } from "./analyze.js";

// Mode corrections de l'étape 3 (révision) : réponses du modèle simulées,
// aucun appel réseau.

const ROOT = path.resolve(import.meta.dirname, "..");
const { relecture: _relecture, ...ETAPE1 } = JSON.parse(readFileSync(path.join(ROOT, "data/relectures/zemmour-rsa-trois-ans.json"), "utf8"));
const IDS = ["c1", "c2"];
const REVISION = {
  synthese: "Le chiffre est précisé, aucune note ne change.",
  reponses: [
    { commentaire_id: "c1", reponse: "Tu as raison, la fiche cite désormais le chiffre CNAF.", retenu: true },
    { commentaire_id: "c2", reponse: "Le titre reste ainsi.", retenu: false },
  ],
  notes_pour_arno: "Vérifier la source CNAF.",
};
const CRITERES = [
  ["operationnalite_moyens", "Le droit le permet, avec des exemptions à préciser."],
  ["efficacite", "Le retour à l'emploi est **peu probable** pour ces allocataires."],
  ["effets_rebonds_externalites", "La coupure risque de **reporter la charge** sur les départements."],
  ["degre_preparation", "Aucun chiffrage détaillé n'est publié."],
  ["alignement_logique", "La mesure suit la ligne du candidat sur le travail."],
].map(([critere, texte]) => ({ critere, titre: "x", texte }));
const LIMITES = { champ: "limites.texte", avant: null, apres: "Version révisée après relecture du Club : le chiffre de la CNAF est précisé, aucune note ne change.", raison: "Règle 9." };

const reponse = (corrections, autres = {}) => ({
  auditArbitrage: [],
  corrections,
  titre_fiche: "Le RSA limité à trois ans",
  teaser_accueil: "Une date butoir pour pousser vers l'emploi… mais vers quel emploi ?",
  verdict_conclusion: "Une économie plausible, un retour à l'emploi incertain.",
  analyse_par_criteres: CRITERES,
  revision_relecture: REVISION,
  ...autres,
});

test("lireChemin : points, crochets et index numériques", () => {
  assert.deepEqual(lireChemin("contexte_national.texte"), ["contexte_national", "texte"]);
  assert.deepEqual(lireChemin("sources_utilisees[2]"), ["sources_utilisees", 2]);
  assert.deepEqual(lireChemin("a.texte.1"), ["a", "texte", 1]);
  assert.equal(lireChemin("[0].x"), null);
  assert.equal(lireChemin(""), null);
});

test("remplacement simple : le texte change, le reste de la fiche ne bouge pas", () => {
  const avant = "un nombre stable sur un an (CNAF)";
  const v = validerSortieCorrections(
    reponse([{ champ: "contexte_national.texte", avant, apres: "un nombre stable sur un an (CNAF, chiffres 2025)", raison: "Source précisée." }, LIMITES]),
    ETAPE1,
    IDS,
  );
  assert.deepEqual(v.errors, []);
  assert.ok(v.valid);
  const fc = v.arbitrage3.fiche_complete;
  assert.match(fc.contexte_national.texte, /\(CNAF, chiffres 2025\)/);
  assert.ok(fc.limites.texte.endsWith(LIMITES.apres));
  assert.equal(fc.contexte_international.texte, ETAPE1.contexte_international.texte);
  assert.deepEqual(fc.notation_detaillee, ETAPE1.notation_detaillee);
  // Forme d'une sortie d'étape 3 : notes du code, champs racine, sans les champs de l'étape 1.
  assert.deepEqual(fc.analyse_par_criteres.map((c) => [c.critere, c.note, c.note_max]), [
    ["operationnalite_moyens", 16, 30], ["efficacite", 9, 30], ["effets_rebonds_externalites", 5, 20], ["degre_preparation", 2, 10], ["alignement_logique", 7, 10],
  ]);
  assert.equal(fc.analyse_par_criteres[0].titre, "x");
  assert.ok(!("resume_court" in fc) && !("phrase_teasing" in fc));
  assert.equal(v.arbitrage3.resume_court, ETAPE1.resume_court);
  assert.equal(v.arbitrage3.titre_fiche, "Le RSA limité à trois ans");
  assert.equal(v.appliquees.length, 2);
  // La fiche d'entrée n'est jamais modifiée.
  assert.ok(!ETAPE1.contexte_national.texte.includes("chiffres 2025"));
});

test("note modifiée : notation recalculée par le code, phrases citant l'ancien score exigées", () => {
  const note = { champ: "notation_detaillee.efficacite", avant: 9, apres: 6, raison: "Effet sur l'emploi revu à la baisse." };
  const sansResume = validerSortieCorrections(reponse([note, LIMITES]), ETAPE1, IDS);
  assert.ok(!sansResume.valid);
  assert.match(sansResume.errors.join("\n"), /passe de 39 à 36\/100.*citent encore « 39\/100 »/);

  const resume = { champ: "resume_court", avant: "Note : 39/100 (partiellement fondé)", apres: "Note : 36/100 (partiellement fondé)", raison: "Nouveau score." };
  const v = validerSortieCorrections(reponse([note, resume, LIMITES]), ETAPE1, IDS);
  assert.deepEqual(v.errors, []);
  const n = v.arbitrage3.fiche_complete.notation_detaillee;
  assert.deepEqual([n.efficacite, n.score_total, n.appreciation], [6, 36, "partiellement fondé"]);
  assert.equal(v.arbitrage3.fiche_complete.analyse_par_criteres[1].note, 6);
  assert.match(v.arbitrage3.resume_court, /36\/100/);
});

test("ancien score : ignoré dans limites et dans la phrase « Version révisée après relecture du Club »", () => {
  const note = { champ: "notation_detaillee.efficacite", avant: 9, apres: 6, raison: "Effet sur l'emploi revu à la baisse." };
  const resume = { champ: "resume_court", avant: "Note : 39/100 (partiellement fondé)", apres: "Note : 36/100 (partiellement fondé)", raison: "Nouveau score." };
  const phrase = "Version révisée après relecture du Club : l'efficacité est revue à la baisse, le score passe de 39/100 à 36/100.";
  const limites = { ...LIMITES, apres: phrase };
  assert.deepEqual(validerSortieCorrections(reponse([note, resume, limites]), ETAPE1, IDS).errors, []);
  // La même phrase ajoutée à un autre champ est tolérée aussi…
  const verdict = { champ: "verdict_final", avant: null, apres: phrase, raison: "Mention de la révision." };
  assert.deepEqual(validerSortieCorrections(reponse([note, resume, limites, verdict]), ETAPE1, IDS).errors, []);
  // … mais pas l'ancien score cité ailleurs dans ce champ.
  const ancien = { champ: "verdict_final", avant: null, apres: "La mesure obtient 39/100.", raison: "r" };
  assert.match(validerSortieCorrections(reponse([note, resume, limites, ancien]), ETAPE1, IDS).errors.join("\n"), /citent encore « 39\/100 »/);
});

test("recalculerNotation : plafond, déclencheur, appréciation", () => {
  const n = recalculerNotation({ ...ETAPE1.notation_detaillee, operationnalite_juridique: 2 });
  assert.deepEqual(
    [n.operationnalite_moyens_total, n.plafond_applique, n.plafond_declencheur, n.score_total, n.appreciation],
    [10, true, "juridique", 33, "fragile"],
  );
});

test("« avant » introuvable ou ambigu : erreur à renvoyer au modèle, rien d'appliqué", () => {
  const { appliquees, erreurs } = appliquerCorrections(ETAPE1, [
    { champ: "contexte_national.texte", avant: "un passage qui n'existe pas", apres: "x", raison: "r" },
    { champ: "contexte_national.texte", avant: "RSA", apres: "x", raison: "r" },
  ]);
  assert.equal(appliquees.length, 0);
  assert.match(erreurs[0], /corrections\[0\] \(contexte_national\.texte\) : « avant » introuvable/);
  assert.match(erreurs[1], /apparaît \d+ fois/);
  const message = messageCorrectionEtape3(erreurs, { corrections: true });
  assert.match(message, /FORMAT MODE CORRECTIONS/);
  assert.ok(message.includes(erreurs[0]));
});

test("corrections qui casseraient la structure : refusées", () => {
  const cas = [
    [{ champ: "notation_detaillee.efficacite", avant: 9, apres: 45, raison: "r" }, /fiche corrigée : notation_detaillee\.efficacite/],
    [{ champ: "notation_detaillee.score_total", avant: 39, apres: 50, raison: "r" }, /recalculé par le code/],
    [{ champ: "notation_detaillee.qualification_efficacite", avant: "FRAGILE", apres: "TRÈS FRAGILE", raison: "r" }, /qualification_efficacite/],
    [{ champ: "notation_detaillee.efficacite", avant: 9, apres: "six", raison: "r" }, /nombre entier/],
    [{ champ: "contexte_national", avant: "x", apres: "y", raison: "r" }, /non modifiable/],
    [{ champ: "champ_inconnu", avant: "x", apres: "y", raison: "r" }, /introuvable dans la fiche relue/],
    [{ champ: "contexte_national.texte", avant: "(CNAF)", apres: "x" }, /raison manquante/],
  ];
  for (const [correction, attendu] of cas) {
    const v = validerSortieCorrections(reponse([correction, LIMITES]), ETAPE1, IDS);
    assert.ok(!v.valid, JSON.stringify(correction));
    assert.match(v.errors.join("\n"), attendu);
  }
  // Champs à rédiger et revision_relecture contrôlés aussi.
  const v = validerSortieCorrections(reponse([], { titre_fiche: "", analyse_par_criteres: CRITERES.slice(1), revision_relecture: { ...REVISION, reponses: [] } }), ETAPE1, IDS);
  assert.match(v.errors.join("\n"), /titre_fiche : texte attendu/);
  assert.match(v.errors.join("\n"), /revision_relecture : reponses : aucune réponse pour c1, c2/);
  assert.match(v.errors.join("\n"), /analyse_par_criteres : il faut exactement les 5 critères.*operationnalite_moyens/);
});

test("ajouts : source à la fin de la liste ; phrase de révision exigée dès qu'une correction existe", () => {
  const source = { champ: "sources_utilisees", avant: null, apres: "CNAF, Prestations légales, 2025", raison: "Nouvelle source." };
  const v = validerSortieCorrections(reponse([source, LIMITES]), ETAPE1, IDS);
  assert.ok(v.valid);
  assert.equal(v.arbitrage3.fiche_complete.sources_utilisees.at(-1), source.apres);
  const sansPhrase = validerSortieCorrections(reponse([source]), ETAPE1, IDS);
  assert.match(sansPhrase.errors.join("\n"), /Version révisée après relecture du Club/);
});

test("liste vide : fiche relue reprise telle quelle", () => {
  const v = validerSortieCorrections(reponse([]), ETAPE1, IDS);
  assert.deepEqual(v.errors, []);
  const { resume_court: _r, phrase_teasing: _p, analyse_par_criteres: _a, ...reste } = ETAPE1;
  const { analyse_par_criteres: _criteres, verdict_conclusion: _v, ...fc } = v.arbitrage3.fiche_complete;
  assert.deepEqual(fc, reste);
  assert.equal(v.arbitrage3.verdict_final, ETAPE1.verdict_final);
  assert.deepEqual(v.appliquees, []);
});

test("requête en mode corrections : FORMAT ÉTAPE 3 remplacé, cache sur le dernier bloc, recherches restantes", () => {
  const commentaires = [{ id: "c1", sectionLabel: null, body: "Chiffre daté.", quotedText: null }];
  const body = construireRequeteEtape3(ETAPE1, null, commentaires, { corrections: true });
  const [gabarit, consignes, bloc] = body.messages[0].content;
  assert.equal(body.messages[0].content.length, 3);
  assert.ok(!gabarit.text.includes("FORMAT ÉTAPE 3") && gabarit.text.includes("## MISE EN TEXTE FINALE"));
  assert.match(consignes.text, /^MODE CORRECTIONS/);
  assert.match(consignes.text, /FORMAT MODE CORRECTIONS/);
  assert.match(bloc.text, /^COMMENTAIRES DU CLUB/);
  assert.deepEqual(bloc.cache_control, { type: "ephemeral" });
  assert.deepEqual(body.tools, [{ type: "web_search_20260209", name: "web_search", max_uses: 3 }]);
  // Ancien mode (repli) : gabarit complet, comme avant.
  const repli = construireRequeteEtape3(ETAPE1, null, commentaires);
  assert.equal(repli.messages[0].content.length, 2);
  assert.match(repli.messages[0].content[0].text, /FORMAT ÉTAPE 3/);
  assert.equal(gabaritSansFormat(repli.messages[0].content[0].text), gabarit.text);
  // Recherches épuisées : plus d'outil.
  assert.equal(construireRequeteEtape3(ETAPE1, null, commentaires, { corrections: true, recherchesFaites: 1 }).tools[0].max_uses, 2);
  assert.ok(!("tools" in construireRequeteEtape3(ETAPE1, null, commentaires, { corrections: true, recherchesFaites: 3 })));
});

test("traçabilité : mode et tokens de sortie dans coutPipeline, corrections et repli dans le rapport", () => {
  const usage3 = { input_tokens: 20_000, output_tokens: 3_500 };
  assert.ok(!("modeEtape3" in buildCoutPipeline({ usage2: null, usage3, usage3bis: {} })));
  const cout = buildCoutPipeline({ usage2: null, usage3, usage3bis: {}, modeEtape3: "corrections" });
  assert.equal(cout.modeEtape3, "corrections");
  assert.equal(cout.sortieEtape3, 3_500);

  const corrections = [
    { champ: "contexte_national.texte", avant: "stable\n\nsur un an", apres: "stable | 2025", raison: "Source précisée." },
    { champ: "limites.texte", avant: null, apres: "Version révisée…", raison: "Règle 9." },
  ];
  assert.match(lignesModeEtape3({ mode: "corrections", corrections }, cout)[0], /mode corrections, 2 correction\(s\) appliquée\(s\), 3\s500 tokens en sortie/);
  const section = sectionCorrections({ mode: "corrections", corrections }).join("\n");
  assert.match(section, /### Corrections appliquées \(2\)/);
  assert.ok(section.includes("- `contexte_national.texte` : « stable / sur un an » → « stable \\| 2025 »"));
  assert.ok(section.includes("(ajout) → « Version révisée… »"));
  const repli = lignesModeEtape3({ mode: "repli_fiche_complete", corrections: [], erreursCorrections: ["« avant » introuvable"] }, cout);
  assert.match(repli[0], /repli sur la fiche complète/);
  assert.equal(repli[1], "  - « avant » introuvable");
  assert.deepEqual(sectionCorrections({ mode: "repli_fiche_complete", corrections: [] }), []);
  assert.deepEqual(lignesModeEtape3(null), []);
});
