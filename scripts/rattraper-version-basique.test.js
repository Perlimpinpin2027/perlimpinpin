import { test } from "node:test";
import assert from "node:assert/strict";
import { aBesoinDeVersionBasique } from "./rattraper-version-basique.js";

const sans = { contenuComplet: { titre_fiche: "x" } };
const avec = { contenuComplet: { version_basique: { resume: "r" } } };

test("brouillon sans version basique : rattrapé, en lot comme ciblé", () => {
  assert.equal(aBesoinDeVersionBasique({ ...sans, statut: "brouillon" }), true);
  assert.equal(aBesoinDeVersionBasique({ ...sans, statut: "brouillon" }, { ciblee: true }), true);
});

test("fiche publiée : rattrapée seulement si elle est ciblée par son numéro", () => {
  assert.equal(aBesoinDeVersionBasique({ ...sans, statut: "publie" }), false);
  assert.equal(aBesoinDeVersionBasique({ ...sans, statut: "publie" }, { ciblee: true }), true);
});

test("jamais une fiche à la corbeille, jamais une fiche qui a déjà sa version basique", () => {
  assert.equal(aBesoinDeVersionBasique({ ...sans, statut: "corbeille" }, { ciblee: true }), false);
  assert.equal(aBesoinDeVersionBasique({ ...avec, statut: "publie" }, { ciblee: true }), false);
  assert.equal(aBesoinDeVersionBasique({ ...avec, statut: "brouillon" }), false);
});
