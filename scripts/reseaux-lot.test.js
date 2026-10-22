import { test } from "node:test";
import assert from "node:assert/strict";
import { alertesFiche, choisirFiches, estimationCout, recapitulatif } from "./lib/reseaux-lot.js";

const analyse = (id, propositionId) => ({ id, proposition: { id: propositionId } });

test("lot : dernière analyse publiée de chaque fiche, sans celles qui ont déjà des reseaux, n premières", () => {
  // Plus récente d'abord ; la fiche 7 a deux analyses publiées (12 puis 9).
  const analyses = [analyse(12, 7), analyse(11, 6), analyse(10, 5), analyse(9, 7), analyse(8, 4), analyse(7, 3)];
  const avecReseaux = new Set([11]);
  assert.deepEqual(choisirFiches(analyses, avecReseaux, 3).map((a) => a.id), [12, 10, 8]);
  // L'ancienne analyse 9 de la fiche 7 n'est jamais retenue, même si la 12 a des reseaux.
  assert.deepEqual(choisirFiches(analyses, new Set([12]), 10).map((a) => a.id), [11, 10, 8, 7]);
  assert.deepEqual(choisirFiches([], new Set(), 5), []);
});

test("lot : coût estimé, alertes avant appel, récapitulatif", () => {
  assert.deepEqual(estimationCout(10), { min: 0.3, max: 1.1 });
  assert.deepEqual(alertesFiche({ compteX: "@x", portraitExiste: true }), []);
  assert.equal(alertesFiche({ compteX: null, portraitExiste: false }).length, 2);
  const lignes = recapitulatif([
    { propositionId: 38, candidat: "Marine Le Pen", statut: "ecrite", avertissements: 3, cout: 0.05 },
    { propositionId: 12, candidat: "Éric Zemmour", statut: "echec", raison: "fil.3 : 300 caractères", cout: 0.11 },
  ]);
  assert.ok(lignes.includes("Fiches écrites : 1"));
  assert.ok(lignes.some((l) => l.includes("fiche 38 (Marine Le Pen) : 3 avertissement(s)")));
  assert.ok(lignes.some((l) => l.includes("✗ fiche 12 (Éric Zemmour) : fil.3 : 300 caractères")));
  assert.ok(lignes.includes("Coût total estimé : ~$0.1600"));
  assert.ok(recapitulatif([], { dryRun: true }).includes("Fiches simulées (rien d'écrit) : 0"));
  const aRaccourcir = recapitulatif([{ propositionId: 56, candidat: "X", statut: "ecrite", avertissements: 2, aRaccourcir: 1, cout: 0.1 }]);
  assert.ok(aRaccourcir.some((l) => l.includes("dont 1 tweet(s) à raccourcir avant de poster")));
});
