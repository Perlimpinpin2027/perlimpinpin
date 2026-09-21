import test from "node:test";
import assert from "node:assert/strict";
import { buildInterviewInput, pointsFaibles } from "../src/lib/live-interview.js";
import { hasInternalJargon } from "../src/lib/live-questions.js";

// Entrée de l'interview complète : uniquement l'analyse déjà stockée, avec les
// points faibles traduits en langage courant (jamais en vocabulaire de notation).

const notation = (overrides) => ({
  operationnalite_juridique: 8,
  operationnalite_budgetaire: 8,
  operationnalite_moyens_humains: 8,
  degre_preparation: 8,
  efficacite: 25,
  effets_rebonds_externalites: 15,
  alignement_logique: 8,
  ...overrides,
});

test("pointsFaibles : aucune fragilité pour de bonnes notes", () => {
  assert.deepEqual(pointsFaibles(notation({})), []);
  assert.deepEqual(pointsFaibles(null), []);
  assert.deepEqual(pointsFaibles(undefined), []);
});

test("pointsFaibles : chaque note faible devient un constat en langage courant", () => {
  const hints = pointsFaibles(
    notation({
      operationnalite_budgetaire: 1,
      operationnalite_juridique: 2,
      operationnalite_moyens_humains: 3,
      degre_preparation: 1,
      efficacite: 5,
      effets_rebonds_externalites: 2,
      alignement_logique: 0,
    }),
  );
  assert.equal(hints.length, 7);
  assert.ok(hints.some((hint) => /financement/.test(hint)));
  assert.ok(hints.some((hint) => /juridique/.test(hint)));
});

test("pointsFaibles : le vocabulaire de notation n'apparaît jamais dans les constats", () => {
  const hints = pointsFaibles(
    notation({ operationnalite_budgetaire: 0, operationnalite_juridique: 0, operationnalite_moyens_humains: 0, degre_preparation: 0, efficacite: 0, effets_rebonds_externalites: 0, alignement_logique: 0 }),
  );
  for (const hint of hints) assert.equal(hasInternalJargon(hint), false, hint);
});

test("buildInterviewInput : n'envoie que l'analyse stockée, questions déjà préparées incluses", () => {
  const detail = {
    declaration: "Texte de la déclaration.",
    candidat: { nom: "Candidate Test" },
    mesures: [
      {
        mesure_reformulee: "Mesure A",
        passage: "citation",
        ce_qui_est_etabli: "établi",
        ce_qui_est_discutable: "discutable",
        points_a_verifier: ["à vérifier"],
        verdict_court: "verdict",
        notation_detaillee: notation({ operationnalite_budgetaire: 1 }),
      },
    ],
    affirmations: [{ texte: "Une affirmation", verdict: "Non étayé", sources: [1] }],
    sources: [{ id: 1, nom: "INSEE", date: null, url: "https://www.insee.fr" }],
    questions: {
      essentielles: [{ texte: "Comment financez-vous cela ?" }],
      difficiles: [{ texte: "Pourquoi maintenant ?" }],
      etendu: false,
    },
  };
  const input = buildInterviewInput(detail);
  assert.equal(input.candidat, "Candidate Test");
  assert.deepEqual(input.questions_deja_preparees, ["Comment financez-vous cela ?", "Pourquoi maintenant ?"]);
  assert.deepEqual(input.sources, [{ id: 1, nom: "INSEE" }]);
  assert.deepEqual(input.affirmations, [{ texte: "Une affirmation", verdict: "Non étayé" }]);
  assert.equal(input.mesures[0].points_faibles.length, 1);
  // aucun champ de notation brute n'est transmis
  assert.equal(JSON.stringify(input).includes("operationnalite"), false);
  assert.equal(JSON.stringify(input).includes("score_total"), false);
});

test("buildInterviewInput : déclaration tronquée, analyse ancienne sans candidat ni questions", () => {
  const input = buildInterviewInput({
    declaration: "x".repeat(20000),
    candidat: null,
    mesures: [],
    affirmations: [],
    sources: [],
    questions: { essentielles: [], difficiles: [], etendu: false },
  });
  assert.equal(input.candidat, null);
  assert.equal(input.declaration.length, 8000);
  assert.deepEqual(input.questions_deja_preparees, []);
});
