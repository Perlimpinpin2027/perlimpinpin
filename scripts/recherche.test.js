import { test } from "node:test";
import assert from "node:assert/strict";
import { normaliser, motsCles, correspond } from "../src/lib/recherche.js";

test("normaliser retire accents, majuscules et ponctuation", () => {
  assert.equal(normaliser("Énergie & Climat"), "energie climat");
  assert.equal(normaliser("pouvoir d'achat"), "pouvoir d achat");
});

test("motsCles ignore les petits mots", () => {
  assert.deepEqual(motsCles("Prix du carburant"), ["prix", "carburant"]);
  assert.deepEqual(motsCles("pouvoir d'achat"), ["pouvoir", "achat"]);
  assert.deepEqual(motsCles("   "), []);
});

test("correspond exige tous les mots, sans tenir compte des accents", () => {
  const textes = ["Suspendre les CEE pour faire baisser le prix des carburants", "David Lisnard", "Énergie & Climat"];
  assert.equal(correspond(motsCles("prix du carburant"), textes), true);
  assert.equal(correspond(motsCles("energie"), textes), true);
  assert.equal(correspond(motsCles("lisnard retraites"), textes), false);
  assert.equal(correspond(motsCles(""), textes), true);
});
