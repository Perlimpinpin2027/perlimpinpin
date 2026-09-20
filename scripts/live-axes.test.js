import test from "node:test";
import assert from "node:assert/strict";
import { axisLevels, levelTone } from "../src/lib/live-axes.js";

const notation = (overrides) => ({
  operationnalite_juridique: 5,
  operationnalite_budgetaire: 5,
  operationnalite_moyens_humains: 5,
  degre_preparation: 5,
  efficacite: 15,
  effets_rebonds_externalites: 10,
  ...overrides,
});
const mesure = (overrides) => ({ notation_detaillee: notation(overrides) });

test("axisLevels : chiffrage = budgétaire, faisabilité = juridique + moyens humains + préparation, impact = efficacité + effets rebonds", () => {
  const levels = axisLevels([
    mesure({
      operationnalite_budgetaire: 2,
      operationnalite_juridique: 9,
      operationnalite_moyens_humains: 6,
      degre_preparation: 3,
      efficacite: 30,
      effets_rebonds_externalites: 0,
    }),
  ]);
  assert.ok(Math.abs(levels.chiffrage - 0.2) < 1e-9);
  assert.ok(Math.abs(levels.faisabilite - (0.9 + 0.6 + 0.3) / 3) < 1e-9);
  assert.ok(Math.abs(levels.impact - 0.5) < 1e-9);
});

test("axisLevels : moyenne sur plusieurs mesures", () => {
  const levels = axisLevels([mesure({ operationnalite_budgetaire: 0 }), mesure({ operationnalite_budgetaire: 10 })]);
  assert.ok(Math.abs(levels.chiffrage - 0.5) < 1e-9);
});

test("axisLevels : aucune mesure ou notes illisibles ne plantent pas", () => {
  assert.equal(axisLevels([]), null);
  assert.equal(axisLevels(undefined), null);
  assert.equal(axisLevels([{}]), null);
  const levels = axisLevels([mesure({ operationnalite_budgetaire: "abc", efficacite: null })]);
  assert.equal(levels.chiffrage, 0);
  assert.ok(levels.impact >= 0 && levels.impact <= 1);
});

test("axisLevels : valeurs bornées entre 0 et 1", () => {
  const levels = axisLevels([mesure({ operationnalite_budgetaire: 999, efficacite: -50 })]);
  assert.equal(levels.chiffrage, 1);
  assert.ok(levels.impact >= 0);
});

test("levelTone : tiers rouge / orange / vert", () => {
  assert.equal(levelTone(0), "red");
  assert.equal(levelTone(0.33), "red");
  assert.equal(levelTone(0.34), "amber");
  assert.equal(levelTone(0.66), "amber");
  assert.equal(levelTone(0.67), "green");
  assert.equal(levelTone(1), "green");
});
