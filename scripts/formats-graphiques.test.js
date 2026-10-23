import { test } from "node:test";
import assert from "node:assert/strict";
import { formaterNombre, formaterValeur, hautEchelle, texteDonnee } from "../src/lib/formats-graphiques.js";

const NBSP = " ";

test("formaterNombre : virgule décimale et espace insécable des milliers", () => {
  assert.equal(formaterNombre(9.1), "9,1");
  assert.equal(formaterNombre(2500), `2${NBSP}500`);
  assert.equal(formaterNombre(161.5), "161,5");
  assert.equal(formaterNombre(70), "70");
});

test("formaterValeur : pourcentages et milliers", () => {
  assert.equal(formaterValeur(9.1, "%"), `9,1${NBSP}%`);
  assert.equal(formaterValeur(256, "k"), `256${NBSP}000`);
  assert.equal(formaterValeur(161.5, "k"), `161${NBSP}500`);
  assert.equal(formaterValeur(917), "917");
});

test("texteDonnee : le libellé remplace la valeur", () => {
  assert.equal(texteDonnee({ valeur: 8, libelle: "−8 %" }, "%"), "−8 %");
  assert.equal(texteDonnee({ valeur: 30 }, "%"), `30${NBSP}%`);
});

test("hautEchelle : max du graphique, sinon plus grande valeur + 15 %", () => {
  assert.equal(hautEchelle(100, [9.1, 30]), 100);
  assert.ok(Math.abs(hautEchelle(undefined, [550, 800]) - 920) < 1e-9);
  assert.equal(hautEchelle(undefined, []), 1);
});
