import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  LiveAnalyseError,
  analyseDeclaration,
  collectConsultedUrls,
  extractFinalText,
  normalizeMode,
  normalizePlafondDeclencheur,
  renumberSources,
  restrictSourceUrls,
} from "../src/lib/live-analyse.js";
import { simulatedProgress } from "../src/lib/live-progress.js";

// Modes d'analyse « rapide » (sans recherche) et « approfondie » (recherche web).

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
const reponseJson = {
  mesures: [{
    passage: "citation", mesure_reformulee: "Mesure", objectif_court: "Objectif",
    ce_qui_est_etabli: "Établi", ce_qui_est_discutable: "Discutable",
    points_a_verifier: [], notation_detaillee: notation, verdict_court: "Verdict",
  }],
  theme: "autre", remarque: null, niveau_confiance: "élevé",
  affirmations: [{ texte: "Affirmation", verdict: "Cohérent", sources: [1, 2] }],
  sources: [
    { id: 1, nom: "INSEE", date: "2024", url: "https://www.insee.fr/fr/statistiques/1" },
    { id: 2, nom: "Adresse inventée", date: null, url: "https://www.exemple.fr/invente" },
  ],
};

// Remplace fetch par une file de réponses ; retourne les corps de requête reçus.
function mockFetch(responses) {
  const bodies = [];
  process.env.ANTHROPIC_API_KEY = "test";
  globalThis.fetch = async (url, init) => {
    bodies.push(JSON.parse(init.body));
    const next = responses.length > 1 ? responses.shift() : responses[0];
    return new Response(JSON.stringify(next), { status: 200 });
  };
  return bodies;
}
const message = (content, stop_reason = "end_turn", usage = {}) => ({ content, stop_reason, usage });

test("normalizeMode : absent => rapide, valeurs connues acceptées, le reste refusé", () => {
  assert.equal(normalizeMode(undefined), "rapide");
  assert.equal(normalizeMode(null), "rapide");
  assert.equal(normalizeMode(""), "rapide");
  assert.equal(normalizeMode("rapide"), "rapide");
  assert.equal(normalizeMode("approfondie"), "approfondie");
  for (const invalide of ["Approfondie", "deep", 1, {}, ["approfondie"], true]) {
    assert.equal(normalizeMode(invalide), null, String(invalide));
  }
});

test("mode rapide : aucun outil de recherche, consigne « sans recherche » conservée", async () => {
  const bodies = mockFetch([message([{ type: "text", text: JSON.stringify(reponseJson) }])]);
  const result = await analyseDeclaration("Une déclaration de test suffisamment longue.");
  assert.equal(bodies[0].tools, undefined);
  assert.equal(bodies[0].max_tokens, 8000);
  assert.match(bodies[0].system[0].text, /Tu n'as PAS accès à la recherche web/);
  assert.equal(result.mode, "rapide");
  assert.equal("recherches" in result, false);
  // rapide : les adresses fournies sont conservées comme avant
  assert.equal(result.sources[1].url, "https://www.exemple.fr/invente");
});

test("mode approfondie : outil de recherche activé, consigne fondée sur la méthodologie", async () => {
  const bodies = mockFetch([message([{ type: "text", text: JSON.stringify(reponseJson) }])]);
  await analyseDeclaration("Une déclaration de test suffisamment longue.", { mode: "approfondie" });
  const [tool] = bodies[0].tools;
  assert.equal(tool.name, "web_search");
  assert.match(tool.type, /^web_search_/);
  assert.ok(tool.max_uses >= 1 && tool.max_uses <= 10);
  const prompt = bodies[0].system[0].text;
  // règles de recherche reprises de data/prompt-methodologie.md
  const methodo = readFileSync(new URL("../data/prompt-methodologie.md", import.meta.url), "utf8");
  assert.ok(methodo.includes("Privilégier autant que possible les sources primaires"));
  assert.ok(prompt.includes("Privilégier autant que possible les sources primaires"));
  assert.ok(prompt.includes("Fondation IFRAP"));
  assert.match(prompt, /Oxfam/);
  assert.match(prompt, /JAMAIS citées seules/);
  assert.match(prompt, /INSEE, DREES/);
  // plus de consigne « pas de recherche »
  assert.equal(prompt.includes("Tu n'as PAS accès à la recherche web"), false);
  assert.equal(prompt.includes("SANS recherche"), false);
});

test("mode approfondie : adresses non renvoyées par la recherche retirées, mode et recherches enregistrés", async () => {
  mockFetch([message(
    [
      { type: "server_tool_use", name: "web_search", input: { query: "q" } },
      { type: "web_search_tool_result", content: [{ type: "web_search_result", url: "https://www.insee.fr/fr/statistiques/1/", title: "t" }] },
      { type: "text", text: "{\"mesures\":" },
      { type: "text", text: JSON.stringify(reponseJson).slice(11) },
    ],
    "end_turn",
    { server_tool_use: { web_search_requests: 1 } },
  )]);
  const result = await analyseDeclaration("Une déclaration de test suffisamment longue.", { mode: "approfondie" });
  assert.equal(result.mode, "approfondie");
  assert.equal(result.recherches, 1);
  assert.equal(result.sources[0].url, "https://www.insee.fr/fr/statistiques/1"); // trouvée (barre finale ignorée)
  assert.equal(result.sources[0].nom, "INSEE");
  assert.equal(result.sources[1].url, null); // inventée : retirée
  assert.equal(result.sources[1].nom, "Adresse inventée"); // la source elle-même reste
  assert.equal(result.niveau_confiance, "élevé");
});

test("mode approfondie : pause_turn => l'appel est repris avec ce qui a déjà été produit", async () => {
  const partiel = [{ type: "server_tool_use", name: "web_search", input: { query: "q" } }];
  const bodies = mockFetch([
    message(partiel, "pause_turn", { server_tool_use: { web_search_requests: 1 } }),
    message([{ type: "text", text: JSON.stringify(reponseJson) }], "end_turn", { server_tool_use: { web_search_requests: 2 } }),
  ]);
  const result = await analyseDeclaration("Une déclaration de test suffisamment longue.", { mode: "approfondie" });
  assert.equal(bodies.length, 2);
  assert.equal(bodies[0].messages.length, 1);
  assert.deepEqual(bodies[1].messages[1], { role: "assistant", content: partiel });
  assert.equal(result.recherches, 3);
});

test("mode approfondie : pause_turn sans fin => erreur affichable, nombre d'appels borné", async () => {
  const bodies = mockFetch([message([{ type: "server_tool_use", name: "web_search", input: {} }], "pause_turn")]);
  await assert.rejects(
    analyseDeclaration("Une déclaration de test suffisamment longue.", { mode: "approfondie" }),
    (error) => error instanceof LiveAnalyseError && /approfondie/.test(error.message),
  );
  assert.ok(bodies.length <= 5);
});

test("mode inconnu refusé avant tout appel", async () => {
  const bodies = mockFetch([message([])]);
  await assert.rejects(analyseDeclaration("Une déclaration de test suffisamment longue.", { mode: "autre" }), (error) => error.status === 400);
  assert.equal(bodies.length, 0);
});

test("collectConsultedUrls / restrictSourceUrls / extractFinalText", () => {
  const blocks = [
    { type: "text", text: "Je cherche…" },
    { type: "web_search_tool_result", content: [{ url: "https://a.fr/x#ancre" }, { url: "pas une url" }, {}] },
    { type: "web_search_tool_result", content: { type: "web_search_tool_result_error", error_code: "unavailable" } },
    { type: "text", text: "{\"a\":" },
    { type: "text", text: "1}" },
  ];
  const urls = collectConsultedUrls(blocks);
  assert.deepEqual([...urls], ["https://a.fr/x"]);
  assert.equal(extractFinalText(blocks), "{\"a\":1}");
  assert.equal(extractFinalText([{ type: "text", text: "seul" }]), "seul");
  assert.equal(extractFinalText(undefined), "");
  const sources = [{ id: 1, nom: "A", url: "https://a.fr/x/" }, { id: 2, nom: "B", url: "https://b.fr" }, { id: 3, nom: "C", url: null }];
  assert.deepEqual(restrictSourceUrls(sources, urls).map((source) => source.url), ["https://a.fr/x/", null, null]);
});

test("renumberSources : identifiants de 1 à n, renvois des affirmations et des questions mis à jour", () => {
  const q = (sources) => ({ texte: "Q ?", justification: "J", sources, relance: null });
  const result = renumberSources({
    sources: [{ id: 10, nom: "A", url: null }, { id: 12, nom: "B", url: null }, { id: 30, nom: "C", url: null }],
    affirmations: [{ texte: "x", verdict: "Cohérent", sources: [12, 30] }, { texte: "y", verdict: "Incertain", sources: [] }],
    questions: { essentielles: [q([10])], difficiles: [q([30, 12])] },
  });
  assert.deepEqual(result.sources.map((source) => [source.id, source.nom]), [[1, "A"], [2, "B"], [3, "C"]]);
  assert.deepEqual(result.affirmations.map((affirmation) => affirmation.sources), [[2, 3], []]);
  assert.deepEqual(result.questions.essentielles[0].sources, [1]);
  assert.deepEqual(result.questions.difficiles[0].sources, [3, 2]);
});

test("progression simulée : le profil approfondie est plus lent que le rapide, sans jamais atteindre le plafond", () => {
  assert.equal(simulatedProgress(7), simulatedProgress(7, "rapide"));
  assert.equal(simulatedProgress(7, "inconnu"), simulatedProgress(7)); // profil inconnu => rapide
  assert.ok(simulatedProgress(7, "approfondie") < simulatedProgress(7, "rapide") - 30);
  assert.ok(simulatedProgress(60, "approfondie") < simulatedProgress(60, "rapide"));
  // encore en mouvement après 2 minutes, là où le profil rapide a déjà stagné
  const gainRapide = simulatedProgress(180, "rapide") - simulatedProgress(120, "rapide");
  const gainApprofondie = simulatedProgress(180, "approfondie") - simulatedProgress(120, "approfondie");
  assert.ok(gainApprofondie > 5 && gainApprofondie > gainRapide * 5);
  let previous = -1;
  for (let seconds = 0; seconds <= 600; seconds += 5) {
    const value = simulatedProgress(seconds, "approfondie");
    assert.ok(value >= previous && value < 93);
    previous = value;
  }
});

test("plafond_declencheur : « null » en texte et variantes d'écriture corrigés, valeur inconnue avec plafond laissée en l'état", () => {
  const avec = (plafond_applique, plafond_declencheur) => ({ mesures: [{ notation_detaillee: { plafond_applique, plafond_declencheur } }] });
  const lire = (json) => normalizePlafondDeclencheur(json).mesures[0].notation_detaillee.plafond_declencheur;
  assert.equal(lire(avec(false, "null")), null);
  assert.equal(lire(avec(false, "aucun")), null);
  assert.equal(lire(avec(false, "-")), null);
  assert.equal(lire(avec(true, "Budgétaire")), "budgetaire");
  assert.equal(lire(avec(true, "moyens humains")), "moyens_humains");
  assert.equal(lire(avec(false, null)), null);
  assert.equal(lire(avec(true, "juridique")), "juridique");
  // plafond appliqué mais valeur inexploitable : pas de correction silencieuse
  assert.equal(lire(avec(true, "autre chose")), "autre chose");
  assert.doesNotThrow(() => normalizePlafondDeclencheur({}));
  assert.doesNotThrow(() => normalizePlafondDeclencheur(null));
});
