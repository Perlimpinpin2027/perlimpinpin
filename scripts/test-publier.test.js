import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { publierBrouillonCore } from "../src/lib/test-publier.js";

// Logique de « Publier » de /test/[id], testée avec une FAUSSE base : aucune
// connexion réelle, aucune écriture possible. Les méthodes d'écriture de la fausse
// base lèvent une erreur si elles sont appelées alors qu'elles ne devraient pas l'être.

const BROUILLON = {
  id: 7,
  statut: "brouillon",
  scoreFaisabilite: 51,
  propositionId: 70,
  proposition: { candidatId: 3, candidat: { nom: "David Lisnard" } },
};

// Fausse base : `journal` liste, dans l'ordre, tous les appels reçus.
function fausseBase({
  analyse = BROUILLON,
  plusRecenteId = analyse?.id,
  autrePubliee = null,
  publiees = [{ scoreFaisabilite: 80 }, { scoreFaisabilite: 60 }],
  count = 1,
  moyenne = 63.5,
  ecrituresAutorisees = false,
  echecTransaction = null,
} = {}) {
  const journal = [];
  const ecriture = (nom, valeur) => async (args) => {
    journal.push(nom);
    if (!ecrituresAutorisees) throw new Error(`ÉCRITURE INTERDITE : ${nom}`);
    return typeof valeur === "function" ? valeur(args) : valeur;
  };
  const lecture = (nom, valeur) => async (args) => {
    journal.push(nom);
    return typeof valeur === "function" ? valeur(args) : valeur;
  };

  const tx = {
    analyse: {
      updateMany: ecriture("tx.analyse.updateMany", { count }),
      aggregate: lecture("tx.analyse.aggregate", { _avg: { scoreFaisabilite: moyenne } }),
    },
    candidat: {
      update: ecriture("tx.candidat.update", (args) => ({ nom: "David Lisnard", scoreMoyen: args.data.scoreMoyen })),
    },
  };

  const prisma = {
    analyse: {
      findUnique: lecture("analyse.findUnique", analyse),
      // Deux findFirst : la « plus récente » (sans statut) et un éventuel doublon publié.
      findFirst: lecture("analyse.findFirst", (args) =>
        args.where.statut === "publie" ? autrePubliee : { id: plusRecenteId },
      ),
      findMany: lecture("analyse.findMany", publiees),
      update: ecriture("analyse.update", {}),
      updateMany: ecriture("analyse.updateMany", {}),
    },
    candidat: { update: ecriture("candidat.update", {}) },
    $transaction: async (fn) => {
      journal.push("$transaction");
      if (echecTransaction) throw echecTransaction;
      return fn(tx);
    },
  };

  return { prisma, journal, tx };
}

const editeur = async () => true;
const pasEditeur = async () => false;

test("sans cookie valide : « Non autorisé. » et la base n'est même pas consultée", async () => {
  for (const dryRun of [false, true]) {
    const { prisma, journal } = fausseBase({ ecrituresAutorisees: true });
    const resultat = await publierBrouillonCore(7, { isEditor: pasEditeur, prisma, dryRun });
    assert.deepEqual(resultat, { ok: false, message: "Non autorisé." });
    assert.deepEqual(journal, []);
  }
});

test("argument invalide venu du navigateur : refusé sans toucher la base", async () => {
  for (const mauvais of ["7", 0, -1, 1.5, NaN, Infinity, null, undefined, {}, [7]]) {
    const { prisma, journal } = fausseBase({ ecrituresAutorisees: true });
    const resultat = await publierBrouillonCore(mauvais, { isEditor: editeur, prisma, dryRun: false });
    assert.equal(resultat.ok, false, String(mauvais));
    assert.equal(resultat.message, "Analyse introuvable.");
    assert.deepEqual(journal, [], String(mauvais));
  }
});

test("analyse inexistante, déjà publiée, pas la plus récente, doublon publié : refus clairs, aucune écriture", async () => {
  const cas = [
    [{ analyse: null }, /introuvable/i],
    [{ analyse: { ...BROUILLON, statut: "publie" } }, /pas un brouillon/i],
    [{ plusRecenteId: 99 }, /pas l'analyse la plus récente/i],
    [
      { autrePubliee: { id: 5 } },
      /Une version publiée existe déjà pour cette mesure : dépublie-la d'abord \(scripts\/unpublish\.js\)\./,
    ],
  ];
  for (const [options, attendu] of cas) {
    for (const dryRun of [false, true]) {
      const { prisma, journal } = fausseBase(options);
      const resultat = await publierBrouillonCore(7, { isEditor: editeur, prisma, dryRun });
      assert.equal(resultat.ok, false);
      assert.match(resultat.message, attendu);
      assert.ok(!journal.includes("$transaction"));
    }
  }
});

test("simulation : annonce la nouvelle moyenne et n'écrit RIEN", async () => {
  // (80 + 60 + 51) / 3 = 63,666… → 63,7
  const { prisma, journal } = fausseBase({ ecrituresAutorisees: false });
  const resultat = await publierBrouillonCore(7, { isEditor: editeur, prisma, dryRun: true });
  assert.equal(resultat.ok, true);
  assert.equal(resultat.simulation, true);
  assert.equal(
    resultat.message,
    "[Simulation] Cette analyse serait publiée et la moyenne de David Lisnard deviendrait 63.7/100.",
  );
  assert.ok(!journal.includes("$transaction"));
  assert.ok(journal.every((appel) => !/update|aggregate/.test(appel)));
});

test("simulation : premier brouillon publié du candidat → sa moyenne = son score", async () => {
  const { prisma } = fausseBase({ publiees: [] });
  const resultat = await publierBrouillonCore(7, { isEditor: editeur, prisma, dryRun: true });
  assert.match(resultat.message, /deviendrait 51\/100\./);
});

test("publication réelle : une transaction, mêmes étapes et même ordre que scripts/publish.js", async () => {
  const { prisma, journal, tx } = fausseBase({ ecrituresAutorisees: true, moyenne: 63.5 });
  const appels = [];
  const updateMany = tx.analyse.updateMany;
  tx.analyse.updateMany = async (args) => (appels.push(["updateMany", args]), updateMany(args));
  const update = tx.candidat.update;
  tx.candidat.update = async (args) => (appels.push(["candidat.update", args]), update(args));

  const resultat = await publierBrouillonCore(7, { isEditor: editeur, prisma, dryRun: false });

  assert.deepEqual(resultat, {
    ok: true,
    simulation: false,
    analyseId: 7,
    propositionId: 70,
    candidatNom: "David Lisnard",
  });
  // Aucune écriture hors transaction.
  assert.deepEqual(journal.filter((a) => /update|aggregate|\$transaction/.test(a)), [
    "$transaction",
    "tx.analyse.updateMany",
    "tx.analyse.aggregate",
    "tx.candidat.update",
  ]);
  // On ne publie que si l'analyse est ENCORE un brouillon, et on recalcule la moyenne.
  assert.deepEqual(appels[0], ["updateMany", { where: { id: 7, statut: "brouillon" }, data: { statut: "publie" } }]);
  assert.deepEqual(appels[1], ["candidat.update", { where: { id: 3 }, data: { scoreMoyen: 63.5 } }]);
});

test("publication réelle : si quelqu'un l'a déjà publiée (count ≠ 1), on annule avant de toucher au candidat", async () => {
  const { prisma, journal } = fausseBase({ ecrituresAutorisees: true, count: 0 });
  const resultat = await publierBrouillonCore(7, { isEditor: editeur, prisma, dryRun: false });
  assert.equal(resultat.ok, false);
  assert.match(resultat.message, /rien n'a été publié/);
  assert.ok(!journal.includes("tx.candidat.update"));
  assert.ok(!journal.includes("tx.analyse.aggregate"));
});

test("publication réelle : erreur imprévue de la base → message clair, rien n'est affirmé publié", async () => {
  const { prisma } = fausseBase({ ecrituresAutorisees: true, echecTransaction: new Error("connexion perdue") });
  const erreurs = [];
  const original = console.error;
  console.error = (...args) => erreurs.push(args);
  try {
    const resultat = await publierBrouillonCore(7, { isEditor: editeur, prisma, dryRun: false });
    assert.equal(resultat.ok, false);
    assert.match(resultat.message, /a échoué et rien n'a été enregistré/);
    assert.equal(erreurs.length, 1);
  } finally {
    console.error = original;
  }
});

// Garde-fou sur le câblage : l'action exportée passe bien par le contrôle d'accès
// (isEditor) et le mode simulation ne dépend que de TEST_DRY_RUN === "1".
test("publierBrouillon (actions.js) branche isEditor et TEST_DRY_RUN sur la logique testée", () => {
  const source = readFileSync(new URL("../src/app/test/actions.js", import.meta.url), "utf8");
  assert.match(source, /publierBrouillonCore\(analyseId, \{[\s\S]*isEditor,[\s\S]*prisma,[\s\S]*dryRun: process\.env\.TEST_DRY_RUN === "1"/);
  assert.match(source, /^"use server";/);
});
