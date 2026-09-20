import test from "node:test";
import assert from "node:assert/strict";
import { AnalyseLiveSchema, VERDICTS } from "../src/lib/live-analyse.js";

// Schéma de la réponse d'analyse live : le scoring (mesures) est strict, la partie
// « enrichissement » (titre, affirmations, sources…) est tolérante.

const notation = {
  operationnalite_juridique: 5, qualification_juridique: "INCERTAIN",
  operationnalite_budgetaire: 5, qualification_budgetaire: "INCERTAIN",
  operationnalite_moyens_humains: 5, qualification_moyens_humains: "INCERTAIN",
  operationnalite_moyens_total: 15, plafond_applique: false, plafond_declencheur: null,
  efficacite: 15, qualification_efficacite: "INCERTAIN",
  effets_rebonds_externalites: 10, qualification_effets_rebonds: "INCERTAIN",
  degre_preparation: 5, qualification_preparation: "INCERTAIN",
  alignement_logique: 5, qualification_alignement: "INCERTAIN",
  score_total: 50, appreciation: "partiellement fondé",
};
const mesure = {
  passage: "citation", mesure_reformulee: "Mesure", objectif_court: "Objectif",
  ce_qui_est_etabli: "Etabli", ce_qui_est_discutable: "Discutable",
  points_a_verifier: [], notation_detaillee: notation, verdict_court: "Verdict",
};
const base = { mesures: [mesure], theme: "logement", remarque: null };

test("enrichissement absent (ancienne forme) : l'analyse reste valide, valeurs par défaut", () => {
  const result = AnalyseLiveSchema.safeParse(base);
  assert.equal(result.success, true);
  assert.equal(result.data.titre_court, "");
  assert.deepEqual(result.data.affirmations, []);
  assert.deepEqual(result.data.sources, []);
  assert.equal(result.data.niveau_confiance, "moyen");
  assert.deepEqual(result.data.syntheses, { chiffrage: "", faisabilite: "", impact: "" });
});

test("enrichissement complet valide : conservé tel quel", () => {
  const result = AnalyseLiveSchema.safeParse({
    ...base,
    titre_court: "Gel des prix alimentaires",
    synthese_globale: "Synthèse.",
    niveau_confiance: "faible",
    syntheses: { chiffrage: "A.", faisabilite: "B.", impact: "C." },
    affirmations: [{ texte: "Gel pendant deux ans", verdict: "Plutôt cohérent", sources: [1] }],
    sources: [{ id: 1, nom: "INSEE", date: "2024", url: "https://www.insee.fr" }],
  });
  assert.equal(result.success, true);
  assert.equal(result.data.titre_court, "Gel des prix alimentaires");
  assert.equal(result.data.niveau_confiance, "faible");
  assert.equal(result.data.affirmations[0].verdict, "Plutôt cohérent");
  assert.deepEqual(result.data.affirmations[0].sources, [1]);
  assert.equal(result.data.sources[0].url, "https://www.insee.fr");
});

test("URL de source : seules http(s) sont conservées (jamais javascript:, data:, ftp:)", () => {
  const urls = {
    "https://www.insee.fr/fr/accueil": "https://www.insee.fr/fr/accueil",
    "http://exemple.fr": "http://exemple.fr",
    "javascript:alert(1)": null,
    "JAVASCRIPT:alert(1)": null,
    "data:text/html,<script>alert(1)</script>": null,
    "ftp://exemple.fr/x": null,
    "//exemple.fr": null,
    "https://": null,
    "": null,
    "insee.fr": null,
  };
  for (const [input, expected] of Object.entries(urls)) {
    const { data } = AnalyseLiveSchema.safeParse({ ...base, sources: [{ id: 1, nom: "S", date: null, url: input }] });
    assert.equal(data.sources[0].url, expected, JSON.stringify(input));
  }
});

test("date de source : nombre accepté, valeur invalide ignorée", () => {
  const { data } = AnalyseLiveSchema.safeParse({
    ...base,
    sources: [
      { id: 1, nom: "A", date: 2024, url: null },
      { id: 2, nom: "B", date: { x: 1 }, url: null },
    ],
  });
  assert.equal(data.sources[0].date, "2024");
  assert.equal(data.sources[1].date, null);
});

test("verdict hors liste : ramené à « Incertain »", () => {
  const { data } = AnalyseLiveSchema.safeParse({
    ...base,
    affirmations: [
      { texte: "A", verdict: "Vrai", sources: [] },
      { texte: "B", verdict: "Contredit", sources: [] },
    ],
  });
  assert.equal(data.affirmations[0].verdict, "Incertain");
  assert.equal(data.affirmations[1].verdict, "Contredit");
  assert.ok(VERDICTS.includes(data.affirmations[0].verdict));
});

test("affirmation : références à des sources inexistantes ou en double retirées", () => {
  const { data } = AnalyseLiveSchema.safeParse({
    ...base,
    sources: [
      { id: 1, nom: "A", date: null, url: null },
      { id: 1, nom: "A bis (id en double)", date: null, url: null },
      { id: 2, nom: "B", date: null, url: null },
    ],
    affirmations: [{ texte: "X", verdict: "Cohérent", sources: [1, 2, 2, 99] }],
  });
  assert.deepEqual(data.sources.map((s) => s.id), [1, 2]);
  assert.deepEqual(data.affirmations[0].sources, [1, 2]);
});

test("élément invalide ignoré sans faire échouer les autres ni l'analyse", () => {
  const result = AnalyseLiveSchema.safeParse({
    ...base,
    affirmations: [{ verdict: "Cohérent" }, { texte: "Valide", verdict: "Cohérent", sources: [] }, "n'importe quoi", null],
    sources: [{ id: 1 }, { id: 2, nom: "Valide", date: null, url: null }],
  });
  assert.equal(result.success, true);
  assert.equal(result.data.affirmations.length, 1);
  assert.equal(result.data.sources.length, 1);
});

test("plafonds : au plus 8 affirmations et 10 sources", () => {
  const { data } = AnalyseLiveSchema.safeParse({
    ...base,
    affirmations: Array.from({ length: 15 }, (_, i) => ({ texte: `A${i}`, verdict: "Incertain", sources: [] })),
    sources: Array.from({ length: 15 }, (_, i) => ({ id: i + 1, nom: `S${i}`, date: null, url: null })),
  });
  assert.equal(data.affirmations.length, 8);
  assert.equal(data.sources.length, 10);
});

test("niveau de confiance et thème invalides : valeurs par défaut", () => {
  const { data } = AnalyseLiveSchema.safeParse({ ...base, niveau_confiance: "excellent", theme: "inconnu" });
  assert.equal(data.niveau_confiance, "moyen");
  assert.equal(data.theme, "autre");
});

test("le scoring reste strict : une note invalide fait échouer l'analyse", () => {
  const cassé = { ...base, mesures: [{ ...mesure, notation_detaillee: { ...notation, score_total: 250 } }] };
  assert.equal(AnalyseLiveSchema.safeParse(cassé).success, false);
});
