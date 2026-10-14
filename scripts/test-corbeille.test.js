import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mettreALaCorbeilleCore, restaurerDepuisCorbeilleCore } from "../src/lib/test-corbeille.js";

// Logique de « Mettre à la corbeille » de /test, testée avec une FAUSSE base :
// aucune connexion réelle. Les écritures lèvent une erreur si elles ne sont pas
// autorisées pour le test.

const BROUILLON = { id: 52, statut: "brouillon", propositionId: 70 };

function fausseBase({ analyse = BROUILLON, count = 1, ecrituresAutorisees = false } = {}) {
  const journal = [];
  const appels = [];
  const ecriture = (nom, valeur) => async (args) => {
    journal.push(nom);
    appels.push({ nom, args });
    if (!ecrituresAutorisees) throw new Error(`ÉCRITURE INTERDITE : ${nom}`);
    return valeur;
  };
  const prisma = {
    analyse: {
      findUnique: async (args) => {
        journal.push("analyse.findUnique");
        appels.push({ nom: "analyse.findUnique", args });
        return analyse;
      },
      update: ecriture("analyse.update", {}),
      updateMany: ecriture("analyse.updateMany", { count }),
      delete: ecriture("analyse.delete", {}),
      deleteMany: ecriture("analyse.deleteMany", {}),
    },
  };
  return { prisma, journal, appels };
}

const editeur = async () => true;
const pasEditeur = async () => false;

test("sans cookie valide : « Non autorisé. » et la base n'est même pas consultée", async () => {
  for (const dryRun of [false, true]) {
    const { prisma, journal } = fausseBase({ ecrituresAutorisees: true });
    const resultat = await mettreALaCorbeilleCore(52, { isEditor: pasEditeur, prisma, dryRun });
    assert.deepEqual(resultat, { ok: false, message: "Non autorisé." });
    assert.deepEqual(journal, []);
  }
});

test("identifiant invalide : refus sans consulter la base", async () => {
  for (const id of ["52", 0, -1, 1.5, NaN, null, undefined, { id: 52 }]) {
    const { prisma, journal } = fausseBase();
    const resultat = await mettreALaCorbeilleCore(id, { isEditor: editeur, prisma, dryRun: false });
    assert.deepEqual(resultat, { ok: false, message: "Analyse introuvable." });
    assert.deepEqual(journal, []);
  }
});

test("analyse introuvable : refus, aucune écriture", async () => {
  const { prisma, journal } = fausseBase({ analyse: null });
  const resultat = await mettreALaCorbeilleCore(52, { isEditor: editeur, prisma, dryRun: false });
  assert.equal(resultat.ok, false);
  assert.equal(resultat.message, "Analyse introuvable.");
  assert.deepEqual(journal, ["analyse.findUnique"]);
});

test("analyse publiée, déjà à la corbeille ou autre statut : refus, aucune écriture", async () => {
  for (const statut of ["publie", "corbeille", "autre"]) {
    const { prisma, journal } = fausseBase({ analyse: { ...BROUILLON, statut } });
    const resultat = await mettreALaCorbeilleCore(52, { isEditor: editeur, prisma, dryRun: false });
    assert.equal(resultat.ok, false, statut);
    assert.deepEqual(journal, ["analyse.findUnique"], statut);
  }
});

test("mode simulation : tout est contrôlé mais rien n'est écrit", async () => {
  const { prisma, journal } = fausseBase();
  const resultat = await mettreALaCorbeilleCore(52, { isEditor: editeur, prisma, dryRun: true });
  assert.deepEqual(resultat, { ok: true, simulation: true, analyseId: 52, propositionId: 70 });
  assert.deepEqual(journal, ["analyse.findUnique"]);
});

test("brouillon : seul le statut passe de « brouillon » à « corbeille », sous condition", async () => {
  const { prisma, journal, appels } = fausseBase({ ecrituresAutorisees: true });
  const resultat = await mettreALaCorbeilleCore(52, { isEditor: editeur, prisma, dryRun: false });
  assert.deepEqual(resultat, { ok: true, analyseId: 52, propositionId: 70 });
  assert.deepEqual(journal, ["analyse.findUnique", "analyse.updateMany"]);
  assert.deepEqual(appels[1].args, {
    where: { id: 52, statut: "brouillon" },
    data: { statut: "corbeille" },
  });
});

test("publiée entre la lecture et l'écriture (0 ligne modifiée) : refus", async () => {
  const { prisma } = fausseBase({ ecrituresAutorisees: true, count: 0 });
  const resultat = await mettreALaCorbeilleCore(52, { isEditor: editeur, prisma, dryRun: false });
  assert.equal(resultat.ok, false);
  assert.match(resultat.message, /changé entre-temps/);
});

test("aucune suppression définitive dans le code de la corbeille", () => {
  const source = readFileSync(new URL("../src/lib/test-corbeille.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /\.delete(Many)?\s*\(/);
});

// --- Restauration (corbeille -> brouillon) ----------------------------------

const A_LA_CORBEILLE = { ...BROUILLON, statut: "corbeille" };

test("restaurer sans cookie valide : « Non autorisé. » et la base n'est même pas consultée", async () => {
  for (const dryRun of [false, true]) {
    const { prisma, journal } = fausseBase({ analyse: A_LA_CORBEILLE, ecrituresAutorisees: true });
    const resultat = await restaurerDepuisCorbeilleCore(52, { isEditor: pasEditeur, prisma, dryRun });
    assert.deepEqual(resultat, { ok: false, message: "Non autorisé." });
    assert.deepEqual(journal, []);
  }
});

test("restaurer : identifiant invalide ou analyse introuvable : refus, aucune écriture", async () => {
  for (const id of ["52", 0, -1, 1.5, null]) {
    const { prisma, journal } = fausseBase({ analyse: A_LA_CORBEILLE });
    const resultat = await restaurerDepuisCorbeilleCore(id, { isEditor: editeur, prisma, dryRun: false });
    assert.deepEqual(resultat, { ok: false, message: "Analyse introuvable." });
    assert.deepEqual(journal, []);
  }
  const { prisma, journal } = fausseBase({ analyse: null });
  const resultat = await restaurerDepuisCorbeilleCore(52, { isEditor: editeur, prisma, dryRun: false });
  assert.equal(resultat.message, "Analyse introuvable.");
  assert.deepEqual(journal, ["analyse.findUnique"]);
});

test("restaurer une analyse qui n'est pas à la corbeille (brouillon, publiée) : refus, aucune écriture", async () => {
  for (const statut of ["brouillon", "publie"]) {
    const { prisma, journal } = fausseBase({ analyse: { ...BROUILLON, statut } });
    const resultat = await restaurerDepuisCorbeilleCore(52, { isEditor: editeur, prisma, dryRun: false });
    assert.deepEqual(resultat, { ok: false, message: "Cette analyse n'est pas à la corbeille." }, statut);
    assert.deepEqual(journal, ["analyse.findUnique"], statut);
  }
});

test("restaurer en mode simulation : rien n'est écrit", async () => {
  const { prisma, journal } = fausseBase({ analyse: A_LA_CORBEILLE });
  const resultat = await restaurerDepuisCorbeilleCore(52, { isEditor: editeur, prisma, dryRun: true });
  assert.deepEqual(resultat, { ok: true, simulation: true, analyseId: 52, propositionId: 70 });
  assert.deepEqual(journal, ["analyse.findUnique"]);
});

test("restaurer : seul le statut repasse de « corbeille » à « brouillon », sous condition", async () => {
  const { prisma, journal, appels } = fausseBase({ analyse: A_LA_CORBEILLE, ecrituresAutorisees: true });
  const resultat = await restaurerDepuisCorbeilleCore(52, { isEditor: editeur, prisma, dryRun: false });
  assert.deepEqual(resultat, { ok: true, analyseId: 52, propositionId: 70 });
  assert.deepEqual(journal, ["analyse.findUnique", "analyse.updateMany"]);
  assert.deepEqual(appels[1].args, {
    where: { id: 52, statut: "corbeille" },
    data: { statut: "brouillon" },
  });
});

test("restaurer : 0 ligne modifiée (déjà restaurée entre-temps) : refus", async () => {
  const { prisma } = fausseBase({ analyse: A_LA_CORBEILLE, ecrituresAutorisees: true, count: 0 });
  const resultat = await restaurerDepuisCorbeilleCore(52, { isEditor: editeur, prisma, dryRun: false });
  assert.equal(resultat.ok, false);
  assert.match(resultat.message, /changé entre-temps/);
});

// --- Lectures « analyse la plus récente » de /test ---------------------------
// queries.js et les pages importent la vraie base (alias @/lib/prisma) : on
// vérifie donc leur code source, comme test-publier.test.js le fait pour actions.js.

const source = (chemin) => readFileSync(new URL(`../${chemin}`, import.meta.url), "utf8");
const FILTRE_CORBEILLE = /statut: \{ not: "corbeille" \}/;

test("getDeclarationDetail : la prévisualisation ignore la corbeille, le site public ne lit que « publie »", () => {
  const code = source("src/lib/queries.js");
  const debut = code.indexOf("export async function getDeclarationDetail");
  assert.notEqual(debut, -1);
  const fonction = code.slice(debut, code.indexOf("\nexport ", debut + 1));
  assert.match(
    fonction,
    /where: inclureBrouillons \? \{ statut: \{ not: "corbeille" \} \} : \{ statut: "publie" \}/,
  );
});

test("/test/[id], enregistrement et publication : la « plus récente » ignore la corbeille", () => {
  for (const chemin of ["src/app/test/[id]/page.js", "src/lib/test-enregistrer.js", "src/lib/test-publier.js"]) {
    assert.match(source(chemin), FILTRE_CORBEILLE, chemin);
  }
});
