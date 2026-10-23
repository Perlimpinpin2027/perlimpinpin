import { test } from "node:test";
import assert from "node:assert/strict";
import {
  compterParCandidat,
  couleurOrientation,
  mesuresParCandidat,
  partsLeviers,
} from "../src/lib/releve-securite.js";
import INVENTAIRE from "../data/hors-series/inventaire-prises-de-parole.json" with { type: "json" };

test("couleurOrientation : majorité, égalité non nulle, aucune", () => {
  assert.equal(couleurOrientation(2, 1), "capacites");
  assert.equal(couleurOrientation(0, 3), "encadrement");
  assert.equal(couleurOrientation(1, 1), "mixte");
  assert.equal(couleurOrientation(0, 0), "aucune");
});

test("compterParCandidat : tableau attendu sur le relevé du 22 octobre 2026", () => {
  const resultat = compterParCandidat(INVENTAIRE).map((c) => [
    c.nomTri,
    c.moyens,
    c.responsabilite,
    c.methodes,
    c.couleur,
  ]);
  assert.deepEqual(resultat, [
    ["Attal", 4, 1, 1, "capacites"],
    ["Glucksmann", 1, 1, 3, "encadrement"],
    ["Le Pen", 0, 3, 0, "aucune"],
    ["Lisnard", 0, 2, 1, "capacites"],
    ["Mélenchon", 0, 0, 5, "encadrement"],
    ["Philippe", 5, 1, 4, "capacites"],
    ["Retailleau", 1, 3, 2, "capacites"],
    ["Roussel", 0, 1, 2, "encadrement"],
    ["Tondelier", 0, 0, 1, "encadrement"],
    ["Villepin", 2, 0, 0, "aucune"],
    ["Zemmour", 0, 8, 1, "capacites"],
  ]);
});

test("compterParCandidat : les mesures non retenues ne comptent pas", () => {
  const inventaire = {
    candidats: [{ candidat: "A", nomTri: "A", parti: "P" }],
    mesures: [
      { candidat: "A", levier: 3, orientation: "capacites", retenue: true },
      { candidat: "A", levier: 3, orientation: "encadrement", retenue: false },
      { candidat: "A", levier: null, orientation: null, retenue: true },
    ],
  };
  const [a] = compterParCandidat(inventaire);
  assert.equal(a.methodes, 1);
  assert.equal(a.encadrement, 0);
  assert.equal(a.total, 1);
  assert.equal(a.couleur, "capacites");
});

test("partsLeviers : parts qui somment à 1, null sans mesure", () => {
  assert.deepEqual(partsLeviers({ moyens: 1, responsabilite: 1, methodes: 2 }), {
    moyens: 0.25,
    responsabilite: 0.25,
    methodes: 0.5,
  });
  assert.equal(partsLeviers({ moyens: 0, responsabilite: 0, methodes: 0 }), null);
});

test("mesuresParCandidat : toutes les mesures, triées par date, sans date en premier", () => {
  const groupes = mesuresParCandidat(INVENTAIRE);
  assert.equal(
    groupes.reduce((n, g) => n + g.mesures.length, 0),
    INVENTAIRE.mesures.length,
  );
  for (const g of groupes) {
    const dates = g.mesures.map((m) => m.date ?? "");
    assert.deepEqual(dates, [...dates].sort());
  }
});
