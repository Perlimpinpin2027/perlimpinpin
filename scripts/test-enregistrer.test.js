import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { enregistrerTexteCore } from "../src/lib/test-enregistrer.js";
import { truncateTeaser } from "../src/lib/test-edition.js";

// Action « Enregistrer » d'un texte modifié, testée avec une FAUSSE base : aucune
// connexion réelle. Les méthodes d'écriture plantent si elles sont appelées alors
// qu'elles ne devraient pas l'être (simulation, refus).

const VERSION = "2026-09-21T10:00:00.000Z";
const CONTENU = {
  titre_fiche: "Titre d'origine de la fiche",
  resume_court: "Résumé d'origine, assez long pour être valide.",
  notation_detaillee: { solidite_faits_total: 21 },
  verdict_final: "Verdict.",
};
const ANALYSE = {
  id: 7,
  statut: "brouillon",
  updatedAt: new Date(VERSION),
  propositionId: 70,
  contenuComplet: CONTENU,
};
const RESUME_VALIDE = "Un nouveau résumé, assez long pour être valide.";

function fausseBase({
  analyse = ANALYSE,
  plusRecenteId = analyse?.id,
  count = 1,
  ecrituresAutorisees = false,
  echecTransaction = null,
} = {}) {
  const journal = [];
  const appels = [];
  const ecriture = (nom, valeur) => async (args) => {
    journal.push(nom);
    appels.push([nom, args]);
    if (!ecrituresAutorisees) throw new Error(`ÉCRITURE INTERDITE : ${nom}`);
    return typeof valeur === "function" ? valeur(args) : valeur;
  };
  const lecture = (nom, valeur) => async (args) => {
    journal.push(nom);
    return typeof valeur === "function" ? valeur(args) : valeur;
  };
  const tx = {
    analyse: { updateMany: ecriture("tx.analyse.updateMany", { count }) },
    proposition: { update: ecriture("tx.proposition.update", {}) },
  };
  const prisma = {
    analyse: {
      findUnique: lecture("analyse.findUnique", analyse),
      findFirst: lecture("analyse.findFirst", { id: plusRecenteId }),
      update: ecriture("analyse.update", {}),
      updateMany: ecriture("analyse.updateMany", {}),
    },
    proposition: { update: ecriture("proposition.update", {}) },
    $transaction: async (fn) => {
      journal.push("$transaction");
      if (echecTransaction) throw echecTransaction;
      return fn(tx);
    },
  };
  return { prisma, journal, appels };
}

const editeur = async () => true;
const pasEditeur = async () => false;
const entree = (surcharge = {}) => ({
  analyseId: 7,
  champ: "resume_court",
  valeur: RESUME_VALIDE,
  versionAttendue: VERSION,
  ...surcharge,
});

test("sans cookie valide : « Non autorisé. » et la base n'est même pas consultée", async () => {
  for (const dryRun of [false, true]) {
    const { prisma, journal } = fausseBase({ ecrituresAutorisees: true });
    const resultat = await enregistrerTexteCore(entree(), { isEditor: pasEditeur, prisma, dryRun });
    assert.deepEqual(resultat, { ok: false, message: "Non autorisé." });
    assert.deepEqual(journal, []);
  }
  // Même avec une entrée absente ou incohérente : l'accès est contrôlé en premier.
  const { prisma, journal } = fausseBase({ ecrituresAutorisees: true });
  assert.equal((await enregistrerTexteCore(undefined, { isEditor: pasEditeur, prisma, dryRun: false })).message, "Non autorisé.");
  assert.deepEqual(journal, []);
});

test("entrée invalide venue du navigateur : refusée sans toucher la base", async () => {
  const cas = [
    [undefined, /introuvable/],
    [null, /introuvable/],
    [entree({ analyseId: "7" }), /introuvable/],
    [entree({ analyseId: 0 }), /introuvable/],
    [entree({ analyseId: 1.5 }), /introuvable/],
    [entree({ versionAttendue: undefined }), /Version du brouillon invalide/],
    [entree({ versionAttendue: "pas une date" }), /Version du brouillon invalide/],
    [entree({ versionAttendue: 123 }), /Version du brouillon invalide/],
    [entree({ champ: "notation_detaillee" }), /ne peut pas être modifié/],
    [entree({ champ: "scoreFaisabilite" }), /ne peut pas être modifié/],
    [entree({ valeur: "" }), /vide/],
    [entree({ valeur: 42 }), /invalide/],
    [entree({ valeur: "Un résumé avec **un gras jamais fermé, assez long." }), /\*\*/],
    [entree({ champ: "titre_fiche", valeur: "Deux\nlignes" }), /seule ligne/],
  ];
  for (const [saisie, attendu] of cas) {
    const { prisma, journal } = fausseBase({ ecrituresAutorisees: true });
    const resultat = await enregistrerTexteCore(saisie, { isEditor: editeur, prisma, dryRun: false });
    assert.equal(resultat.ok, false, JSON.stringify(saisie));
    assert.match(resultat.message, attendu, JSON.stringify(saisie));
    assert.deepEqual(journal, [], JSON.stringify(saisie));
  }
});

test("analyse inexistante, publiée, ou pas la plus récente : refus, aucune écriture", async () => {
  const cas = [
    [{ analyse: null }, /introuvable/i],
    [{ analyse: { ...ANALYSE, statut: "publie" } }, /pas un brouillon/],
    [{ plusRecenteId: 99 }, /pas l'analyse la plus récente/],
  ];
  for (const [options, attendu] of cas) {
    for (const dryRun of [false, true]) {
      const { prisma, journal } = fausseBase(options);
      const resultat = await enregistrerTexteCore(entree(), { isEditor: editeur, prisma, dryRun });
      assert.equal(resultat.ok, false);
      assert.match(resultat.message, attendu);
      assert.ok(!journal.includes("$transaction"));
    }
  }
});

test("conflit : la version attendue n'est plus celle de la base → message exact, aucune écriture", async () => {
  for (const dryRun of [false, true]) {
    const { prisma, journal } = fausseBase();
    const resultat = await enregistrerTexteCore(
      entree({ versionAttendue: "2026-09-21T09:59:59.999Z" }),
      { isEditor: editeur, prisma, dryRun },
    );
    assert.deepEqual(resultat, {
      ok: false,
      message: "Ce brouillon a été modifié entre-temps. Recharge la page pour voir la dernière version.",
    });
    assert.ok(!journal.includes("$transaction"));
  }
});

test("simulation : annonce le nombre de caractères et n'écrit RIEN", async () => {
  const { prisma, journal } = fausseBase({ ecrituresAutorisees: false });
  const resultat = await enregistrerTexteCore(entree({ valeur: `  ${RESUME_VALIDE}\r\n` }), {
    isEditor: editeur,
    prisma,
    dryRun: true,
  });
  assert.deepEqual(resultat, {
    ok: true,
    simulation: true,
    message: `[Simulation] Le texte serait enregistré (${RESUME_VALIDE.length} caractères).`,
  });
  assert.ok(!journal.includes("$transaction"));
  assert.ok(journal.every((appel) => !/update/i.test(appel)));
});

test("enregistrement du résumé : une transaction, analyse mise à jour (contenu + teaser), proposition intacte", async () => {
  const { prisma, journal, appels } = fausseBase({ ecrituresAutorisees: true });
  const long = `${"Une phrase de test un peu longue pour dépasser la limite. ".repeat(12)}Fin.`;
  const avant = Date.now();
  const resultat = await enregistrerTexteCore(entree({ valeur: long }), { isEditor: editeur, prisma, dryRun: false });

  assert.equal(resultat.ok, true);
  assert.equal(resultat.simulation, false);
  assert.equal(resultat.analyseId, 7);
  assert.equal(resultat.propositionId, 70);
  assert.equal(resultat.champ, "resume_court");
  assert.equal(resultat.avant, CONTENU.resume_court);
  assert.equal(resultat.apres, long);
  // Nouvelle version : strictement postérieure à l'ancienne, et c'est celle qu'on renvoie.
  assert.ok(new Date(resultat.versionSuivante).getTime() > new Date(VERSION).getTime());
  assert.ok(new Date(resultat.versionSuivante).getTime() >= avant);

  assert.deepEqual(journal.filter((a) => /update|\$transaction/.test(a)), ["$transaction", "tx.analyse.updateMany"]);

  const [nom, args] = appels[0];
  assert.equal(nom, "tx.analyse.updateMany");
  // Le where verrouille : brouillon ET version vue par l'éditeur.
  assert.deepEqual(args.where, { id: 7, statut: "brouillon", updatedAt: new Date(VERSION) });
  assert.equal(args.data.teaser, truncateTeaser(long));
  assert.equal(args.data.updatedAt.toISOString(), resultat.versionSuivante);
  // Le contenu écrit : seul resume_court a changé, notes intactes.
  assert.equal(args.data.contenuComplet.resume_court, long);
  assert.equal(args.data.contenuComplet.titre_fiche, CONTENU.titre_fiche);
  assert.deepEqual(args.data.contenuComplet.notation_detaillee, CONTENU.notation_detaillee);
  assert.deepEqual(Object.keys(args.data).sort(), ["contenuComplet", "teaser", "updatedAt"]);
  // L'objet lu en base n'a pas été modifié en place.
  assert.equal(CONTENU.resume_court, "Résumé d'origine, assez long pour être valide.");
});

test("enregistrement du titre : contenu + Proposition.titre (coupé à 80), pas de teaser", async () => {
  const { prisma, journal, appels } = fausseBase({ ecrituresAutorisees: true });
  const titre = "Une mesure très ambitieuse pour la fiscalité des grandes successions en France depuis toujours";
  const resultat = await enregistrerTexteCore(entree({ champ: "titre_fiche", valeur: titre }), {
    isEditor: editeur,
    prisma,
    dryRun: false,
  });

  assert.equal(resultat.ok, true);
  assert.equal(resultat.avant, CONTENU.titre_fiche);
  assert.deepEqual(journal.filter((a) => /update|\$transaction/.test(a)), [
    "$transaction",
    "tx.analyse.updateMany",
    "tx.proposition.update",
  ]);
  const [, argsAnalyse] = appels[0];
  assert.equal(argsAnalyse.data.contenuComplet.titre_fiche, titre); // texte complet dans le contenu
  assert.ok(!("teaser" in argsAnalyse.data));
  const [, argsProposition] = appels[1];
  assert.deepEqual(argsProposition, {
    where: { id: 70 },
    data: { titre: "Une mesure très ambitieuse pour la fiscalité des grandes successions en France…" },
  });
});

const CONTENU_V4 = {
  schema_version: "v4",
  titre_fiche: "Titre v4",
  resume_court: "Résumé v4 d'origine, assez long pour être valide.",
  analyse_par_criteres: [{ critere: "efficacite", titre: "Efficacité", note: 9, note_max: 20, texte: "Texte d'origine du critère." }],
  verdict_final: "Verdict d'origine, assez long.",
  verdict_conclusion: "Conclusion d'origine.",
  sources_utilisees: ["Source A", "Source B"],
  notation_detaillee: { score_total: 57 },
};

async function enregistrerV4(champ, valeur) {
  const base = fausseBase({ ecrituresAutorisees: true, analyse: { ...ANALYSE, contenuComplet: CONTENU_V4 } });
  const resultat = await enregistrerTexteCore(entree({ champ, valeur }), { isEditor: editeur, prisma: base.prisma, dryRun: false });
  return { resultat, ...base };
}

test("enregistrement du verdict : Analyse.verdict mis à jour dans la même écriture, resumeAccueil jamais", async () => {
  const verdict = "Nouveau verdict final, assez long pour passer.";
  const { resultat, journal, appels } = await enregistrerV4("verdict_final", verdict);
  assert.equal(resultat.ok, true);
  assert.deepEqual(journal.filter((a) => /update|\$transaction/.test(a)), ["$transaction", "tx.analyse.updateMany"]);
  const [, args] = appels[0];
  assert.deepEqual(Object.keys(args.data).sort(), ["contenuComplet", "updatedAt", "verdict"]);
  assert.equal(args.data.verdict, verdict);
  assert.equal(args.data.contenuComplet.verdict_final, verdict);
});

test("enregistrement des sources : tableau dans le contenu, liste à puces dans Analyse.sourcesUtilisees", async () => {
  const { resultat, appels } = await enregistrerV4("sources_utilisees", "Source A\n\nSource C");
  assert.equal(resultat.ok, true);
  assert.deepEqual(resultat.avant, ["Source A", "Source B"]);
  assert.deepEqual(resultat.apres, ["Source A", "Source C"]);
  const [, args] = appels[0];
  assert.deepEqual(Object.keys(args.data).sort(), ["contenuComplet", "sourcesUtilisees", "updatedAt"]);
  assert.deepEqual(args.data.contenuComplet.sources_utilisees, ["Source A", "Source C"]);
  assert.equal(args.data.sourcesUtilisees, "• Source A\n• Source C");
});

test("enregistrement d'un texte sans colonne copiée (critère, conclusion) : seul le contenu change", async () => {
  for (const champ of ["analyse_par_criteres.0.texte", "verdict_conclusion"]) {
    const { resultat, journal, appels } = await enregistrerV4(champ, "Nouveau texte, assez long pour passer.");
    assert.equal(resultat.ok, true, champ);
    assert.deepEqual(journal.filter((a) => /update|\$transaction/.test(a)), ["$transaction", "tx.analyse.updateMany"], champ);
    assert.deepEqual(Object.keys(appels[0][1].data).sort(), ["contenuComplet", "updatedAt"], champ);
  }
});

test("test-enregistrer.js n'écrit jamais resumeAccueil", () => {
  const source = readFileSync(new URL("../src/lib/test-enregistrer.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /resumeAccueil\s*:/);
});

test("enregistrement : si quelqu'un est passé avant (count = 0), on annule avant de toucher à la proposition", async () => {
  const { prisma, journal } = fausseBase({ ecrituresAutorisees: true, count: 0 });
  const resultat = await enregistrerTexteCore(entree({ champ: "titre_fiche", valeur: "Un autre titre" }), {
    isEditor: editeur,
    prisma,
    dryRun: false,
  });
  assert.equal(resultat.ok, false);
  assert.match(resultat.message, /modifié entre-temps/);
  assert.ok(!journal.includes("tx.proposition.update"));
});

test("enregistrement : erreur imprévue de la base → message clair, rien n'est affirmé enregistré", async () => {
  const { prisma } = fausseBase({ ecrituresAutorisees: true, echecTransaction: new Error("connexion perdue") });
  const erreurs = [];
  const original = console.error;
  console.error = (...args) => erreurs.push(args);
  try {
    const resultat = await enregistrerTexteCore(entree(), { isEditor: editeur, prisma, dryRun: false });
    assert.equal(resultat.ok, false);
    assert.match(resultat.message, /a échoué et rien n'a été modifié/);
    assert.equal(erreurs.length, 1);
  } finally {
    console.error = original;
  }
});

test("contenu illisible en base (pas un objet) : refusé sans écriture", async () => {
  const erreurs = [];
  const original = console.error;
  console.error = (...args) => erreurs.push(args);
  try {
    const { prisma, journal } = fausseBase({ analyse: { ...ANALYSE, contenuComplet: null } });
    const resultat = await enregistrerTexteCore(entree(), { isEditor: editeur, prisma, dryRun: false });
    assert.equal(resultat.ok, false);
    assert.match(resultat.message, /forme attendue/);
    assert.ok(!journal.includes("$transaction"));
  } finally {
    console.error = original;
  }
});

// Garde-fous sur le câblage de l'action exportée.
test("enregistrerTexte (actions.js) branche isEditor et TEST_DRY_RUN, et journalise l'ancien texte", () => {
  const source = readFileSync(new URL("../src/app/test/actions.js", import.meta.url), "utf8");
  assert.match(source, /enregistrerTexteCore\(entree, \{[\s\S]*isEditor,[\s\S]*prisma,[\s\S]*dryRun: process\.env\.TEST_DRY_RUN === "1"/);
  assert.match(source, /evenement: "test_modification_texte"[\s\S]*avant: resultat\.avant[\s\S]*apres: resultat\.apres/);
  assert.match(source, /revalidatePath\("\/test"\)[\s\S]*revalidatePath\(`\/test\/\$\{resultat\.propositionId\}`\)/);
});

test("test-enregistrer.js n'écrit qu'avec updateMany (analyse) et update (proposition), jamais de create/delete/upsert", () => {
  const source = readFileSync(new URL("../src/lib/test-enregistrer.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /\.(create|createMany|delete|deleteMany|upsert)\(/);
  assert.doesNotMatch(source, /\$executeRaw|\$queryRaw/);
});
