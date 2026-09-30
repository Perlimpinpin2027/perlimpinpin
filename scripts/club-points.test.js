import test from "node:test";
import assert from "node:assert/strict";
import { bilanAdherent, calculerPoints, rangPour } from "../src/lib/club-points-core.js";

// PerlimpinPOINTS et rangs du Club Perlimpinpin (src/lib/club-points-core.js).

// n commentaires sur la fiche `ficheSlug`, dont les `retenus` premiers sont retenus.
function commentaires(ficheSlug, n, { retenus = 0 } = {}) {
  return Array.from({ length: n }, (_, i) => ({ ficheSlug, retenu: i < retenus }));
}

test("aucun commentaire : 0 point, Bronze", () => {
  assert.equal(calculerPoints([]), 0);
  assert.deepEqual(rangPour(0), { rang: "Bronze", palier: 0, prochainRang: "Silver", pointsAvantProchain: 150 });
});

test("10 points par commentaire", () => {
  assert.equal(calculerPoints(commentaires("a", 1)), 10);
  assert.equal(calculerPoints(commentaires("a", 3)), 30);
});

test("7 commentaires sur une même fiche : plafond de 5, soit 50 points", () => {
  assert.equal(calculerPoints(commentaires("a", 7)), 50);
});

test("le plafond est par fiche", () => {
  assert.equal(calculerPoints([...commentaires("a", 7), ...commentaires("b", 2)]), 70);
});

test("commentaire retenu : +20 points", () => {
  assert.equal(calculerPoints(commentaires("a", 2, { retenus: 1 })), 40);
});

test("un commentaire retenu au-delà du plafond rapporte quand même +20", () => {
  const liste = commentaires("a", 6);
  liste[5].retenu = true; // le 6e, hors plafond
  assert.equal(calculerPoints(liste), 50 + 20);
});

test("seul retenu === true compte pour le bonus", () => {
  assert.equal(calculerPoints([{ ficheSlug: "a", retenu: "true" }, { ficheSlug: "a", retenu: null }]), 20);
});

test("rangs : paliers de 150 points", () => {
  assert.equal(rangPour(149).rang, "Bronze");
  assert.equal(rangPour(149).pointsAvantProchain, 1);
  assert.deepEqual(rangPour(150), { rang: "Silver", palier: 150, prochainRang: "Gold", pointsAvantProchain: 150 });
  assert.equal(rangPour(300).rang, "Gold");
  assert.deepEqual(rangPour(490), { rang: "Platine", palier: 450, prochainRang: "Diamant", pointsAvantProchain: 110 });
});

test("600 points et plus : Diamant, sans prochain rang", () => {
  for (const p of [600, 601, 5000]) {
    assert.deepEqual(rangPour(p), { rang: "Diamant", palier: 600, prochainRang: null, pointsAvantProchain: null });
  }
});

test("points invalides ou négatifs : Bronze", () => {
  assert.equal(rangPour(-10).rang, "Bronze");
  assert.equal(rangPour(Number.NaN).rang, "Bronze");
});

test("bilanAdherent : points, rang et compteurs", () => {
  const liste = [...commentaires("a", 7, { retenus: 2 }), ...commentaires("b", 3)];
  assert.deepEqual(bilanAdherent(liste), {
    points: 50 + 30 + 40,
    rang: "Bronze",
    palier: 0,
    prochainRang: "Silver",
    pointsAvantProchain: 30,
    nbCommentaires: 10,
    nbRetenus: 2,
    nbFichesCommentees: 2,
  });
});
