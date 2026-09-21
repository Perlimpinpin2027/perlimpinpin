import test from "node:test";
import assert from "node:assert/strict";
import { groupByPeriod, periodOf } from "../src/lib/live-periods.js";

// Regroupement de l'historique : jours calendaires du fuseau de Paris.

// « Maintenant » : lundi 21 septembre 2026, 10 h 00 à Paris (08 h 00 UTC, heure d'été)
const NOW = new Date("2026-09-21T08:00:00Z");
const at = (iso) => new Date(iso);

test("periodOf : même jour calendaire = aujourd'hui, du début à la fin de la journée", () => {
  assert.equal(periodOf(at("2026-09-21T08:00:00Z"), NOW), "aujourdhui");
  assert.equal(periodOf(at("2026-09-21T07:00:00Z"), NOW), "aujourdhui");
  // 00 h 05 à Paris = 22 h 05 UTC la veille : bien « aujourd'hui »
  assert.equal(periodOf(at("2026-09-20T22:05:00Z"), NOW), "aujourdhui");
});

test("periodOf : minuit à Paris fait basculer sur « cette semaine » (pas 24 h glissantes)", () => {
  // 23 h 30 à Paris la veille = 21 h 30 UTC le 20 : hier, même à 10 h 30 d'écart seulement
  assert.equal(periodOf(at("2026-09-20T21:30:00Z"), NOW), "semaine");
  // 24 h + 1 min plus tôt
  assert.equal(periodOf(at("2026-09-20T07:59:00Z"), NOW), "semaine");
});

test("periodOf : cette semaine = les 6 jours précédents, plus ancien au-delà", () => {
  assert.equal(periodOf(at("2026-09-15T12:00:00Z"), NOW), "semaine"); // il y a 6 jours
  assert.equal(periodOf(at("2026-09-14T12:00:00Z"), NOW), "ancien"); // il y a 7 jours
  assert.equal(periodOf(at("2026-08-01T12:00:00Z"), NOW), "ancien");
  assert.equal(periodOf(at("2025-01-01T12:00:00Z"), NOW), "ancien");
});

test("periodOf : le fuseau est celui de Paris, pas celui du serveur (UTC)", () => {
  // 23 h 30 UTC le 20 = 01 h 30 à Paris le 21 : c'est aujourd'hui pour la rédaction
  const nowEarly = new Date("2026-09-21T06:00:00Z");
  assert.equal(periodOf(at("2026-09-20T23:30:00Z"), nowEarly), "aujourdhui");
  // Vu d'UTC ce serait « hier » : on vérifie que le fuseau change bien le résultat
  assert.equal(periodOf(at("2026-09-20T23:30:00Z"), nowEarly, "UTC"), "semaine");
});

test("periodOf : changement d'heure (passage à l'heure d'hiver le 25 octobre 2026)", () => {
  const now = new Date("2026-10-26T09:00:00Z"); // lundi 26 octobre, 10 h à Paris (heure d'hiver)
  assert.equal(periodOf(at("2026-10-25T23:30:00Z"), now), "aujourdhui"); // 00 h 30 à Paris le 26
  assert.equal(periodOf(at("2026-10-25T10:00:00Z"), now), "semaine"); // le 25 à midi : hier (journée de 25 h)
  assert.equal(periodOf(at("2026-10-20T10:00:00Z"), now), "semaine"); // il y a 6 jours calendaires (à cheval sur le changement d'heure)
  assert.equal(periodOf(at("2026-10-19T10:00:00Z"), now), "ancien"); // il y a 7 jours calendaires
});

test("periodOf : date illisible ou dans le futur proche : jamais d'exception", () => {
  assert.equal(periodOf("pas une date", NOW), "ancien");
  assert.equal(periodOf(undefined, NOW), "ancien");
  assert.equal(periodOf(at("2026-09-21T09:00:00Z"), NOW), "aujourdhui"); // horloge un peu en avance
  assert.equal(periodOf("2026-09-21T07:00:00.000Z", NOW), "aujourdhui"); // chaîne ISO (comme en base)
});

test("groupByPeriod : groupes ordonnés, vides omis, ordre interne conservé", () => {
  const items = [
    { id: 1, createdAt: "2026-09-21T07:30:00.000Z" },
    { id: 2, createdAt: "2026-09-21T06:00:00.000Z" },
    { id: 3, createdAt: "2026-09-18T12:00:00.000Z" },
    { id: 4, createdAt: "2026-09-01T12:00:00.000Z" },
    { id: 5, createdAt: "2026-08-15T12:00:00.000Z" },
  ];
  const groups = groupByPeriod(items, NOW);
  assert.deepEqual(groups.map((g) => g.label), ["Aujourd'hui", "Cette semaine", "Plus ancien"]);
  assert.deepEqual(groups[0].items.map((i) => i.id), [1, 2]);
  assert.deepEqual(groups[1].items.map((i) => i.id), [3]);
  assert.deepEqual(groups[2].items.map((i) => i.id), [4, 5]);
});

test("groupByPeriod : un seul groupe présent, ou liste vide", () => {
  const seulAncien = groupByPeriod([{ id: 9, createdAt: "2026-01-01T00:00:00.000Z" }], NOW);
  assert.deepEqual(seulAncien.map((g) => g.id), ["ancien"]);
  assert.deepEqual(groupByPeriod([], NOW), []);
});
