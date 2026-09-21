import test from "node:test";
import assert from "node:assert/strict";
import {
  BASE_LIMITS,
  FULL_LIMITS,
  countQuestions,
  hasInternalJargon,
  parseStoredQuestions,
  questionsSchema,
  restrictQuestionSources,
} from "../src/lib/live-questions.js";

// Questions d'interview : structure tolérante, relances non systématiques, et
// questions naturelles (sans jargon d'évaluation interne).

const q = (texte, extra = {}) => ({ texte, justification: "Parce que.", sources: [], relance: null, ...extra });
const base = questionsSchema(BASE_LIMITS);
const parse = (schema, value) => schema.safeParse(value).data;

test("hasInternalJargon : détecte le vocabulaire d'évaluation interne", () => {
  const jargon = [
    "Votre score en opérationnalité est faible, pourquoi ?",
    "Selon le barème, la mesure est fragile.",
    "Le sous-critère budgétaire est bas.",
    "Le degré de préparation est insuffisant.",
    "Vos effets rebonds & externalités sont mal traités.",
    "La qualification juridique est fragile.",
    "Perlimpinpin estime que...",
    "Pourquoi un score de 34 ?",
  ];
  for (const text of jargon) assert.equal(hasInternalJargon(text), true, text);
});

test("hasInternalJargon : les questions naturelles passent (y compris « critère » ou « note » seuls)", () => {
  const naturelles = [
    "Comment financez-vous cette mesure de 20 milliards d'euros ?",
    "Sur quels critères choisirez-vous les villes concernées ?",
    "Pouvez-vous nous donner une note d'intention plus précise ?",
    "Quel est le calendrier de mise en œuvre ?",
    "Ce dispositif est-il compatible avec le droit européen de la concurrence ?",
  ];
  for (const text of naturelles) assert.equal(hasInternalJargon(text), false, text);
  assert.equal(hasInternalJargon(null), false);
  assert.equal(hasInternalJargon(undefined), false);
});

test("questions au jargon interne : écartées, les autres conservées", () => {
  const data = parse(base, {
    essentielles: [q("Comment financez-vous cette mesure ?"), q("Votre score en opérationnalité est bas, pourquoi ?")],
    difficiles: [q("Que répondez-vous à ceux qui jugent la mesure irréaliste ?", { justification: "Le barème la juge fragile." })],
  });
  assert.equal(data.essentielles.length, 1);
  assert.equal(data.difficiles.length, 0);
});

test("relance au jargon interne : retirée, la question reste", () => {
  const data = parse(base, {
    essentielles: [],
    difficiles: [q("Comment garantissez-vous l'absence de pénurie ?", { relance: "Votre score de préparation est faible, non ?" })],
  });
  assert.equal(data.difficiles.length, 1);
  assert.equal(data.difficiles[0].relance, null);
});

test("relances : jamais sur les questions essentielles", () => {
  const data = parse(base, {
    essentielles: [q("Quel est le coût exact de la mesure ?", { relance: "Et si le coût double ?" })],
    difficiles: [],
  });
  assert.equal(data.essentielles[0].relance, null);
});

test("relances : pas systématiques (plafond), gardées sur les premières questions difficiles", () => {
  const difficiles = Array.from({ length: 4 }, (_, i) => q(`Question difficile numéro ${i + 1} ?`, { relance: `Relance ${i + 1} ?` }));
  const data = parse(base, { essentielles: [], difficiles });
  assert.equal(data.difficiles.filter((question) => question.relance).length, BASE_LIMITS.relances);
  assert.ok(data.difficiles[0].relance && data.difficiles[1].relance);
  assert.equal(data.difficiles[2].relance, null);
});

test("limites de longueur des listes (génération de base et interview complète)", () => {
  const many = (n) => Array.from({ length: n }, (_, i) => q(`Une question numéro ${i + 1} ?`));
  const small = parse(base, { essentielles: many(10), difficiles: many(10) });
  assert.equal(small.essentielles.length, BASE_LIMITS.essentielles);
  assert.equal(small.difficiles.length, BASE_LIMITS.difficiles);
  const full = parse(questionsSchema(FULL_LIMITS), { essentielles: many(20), difficiles: many(20) });
  assert.equal(full.essentielles.length, FULL_LIMITS.essentielles);
  assert.equal(full.difficiles.length, FULL_LIMITS.difficiles);
});

test("éléments invalides ignorés sans faire échouer la liste ; valeurs par défaut", () => {
  const data = parse(base, {
    essentielles: [{ justification: "x" }, "n'importe quoi", null, { texte: "court" }, { texte: "Une vraie question valide ?", sources: "pas un tableau", angle: 12 }],
    difficiles: "pas une liste",
  });
  assert.equal(data.essentielles.length, 1);
  assert.deepEqual(data.essentielles[0].sources, []);
  assert.equal(data.essentielles[0].angle, null);
  assert.deepEqual(data.difficiles, []);
  assert.deepEqual(parse(base, {}), { essentielles: [], difficiles: [] });
});

test("restrictQuestionSources : références inexistantes et doublons retirés", () => {
  const data = restrictQuestionSources(
    { essentielles: [q("Une question de test ?", { sources: [1, 2, 2, 99] })], difficiles: [q("Une autre question ?", { sources: [3] })] },
    [1, 2],
  );
  assert.deepEqual(data.essentielles[0].sources, [1, 2]);
  assert.deepEqual(data.difficiles[0].sources, []);
});

test("parseStoredQuestions : relit la base, tolère null, forme inconnue et anciennes analyses", () => {
  assert.deepEqual(parseStoredQuestions(null), { essentielles: [], difficiles: [], etendu: false });
  assert.deepEqual(parseStoredQuestions("texte"), { essentielles: [], difficiles: [], etendu: false });
  assert.deepEqual(parseStoredQuestions(42), { essentielles: [], difficiles: [], etendu: false });
  const stored = parseStoredQuestions({ essentielles: [q("Une question valide ?")], difficiles: [], etendu: true });
  assert.equal(stored.etendu, true);
  assert.equal(stored.essentielles.length, 1);
  assert.equal(parseStoredQuestions({ essentielles: [], difficiles: [], etendu: "oui" }).etendu, false);
});

test("countQuestions", () => {
  assert.equal(countQuestions(null), 0);
  assert.equal(countQuestions({ essentielles: [q("a"), q("b")], difficiles: [q("c")] }), 3);
});
