import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  CHAT_SYSTEM_RULES,
  OUT_OF_SCOPE_PHRASE,
  QUESTION_MAX_LENGTH,
  buildChatContext,
  normalizeQuestion,
  toClaudeMessages,
} from "../src/lib/live-chat.js";

// Chat sur une analyse : réponses limitées au contenu de l'analyse, conversation
// à plusieurs tours, et table de messages en INSERTION SEULE.

const notation = {
  operationnalite_juridique: 6, operationnalite_budgetaire: 2, operationnalite_moyens_humains: 5,
  operationnalite_moyens_total: 13, efficacite: 12, effets_rebonds_externalites: 8,
  degre_preparation: 3, alignement_logique: 5, score_total: 38,
};
const detail = {
  titre: "Gel des prix alimentaires",
  candidat: { nom: "Candidate Test" },
  dateLabel: "21 septembre 2026",
  themeLabel: "Économie & pouvoir d'achat",
  video: null,
  sourceLabel: null,
  score: 38,
  confiance: "moyen",
  syntheseGlobale: "Synthèse globale.",
  syntheses: { chiffrage: "Chiffrage flou.", faisabilite: "Faisable sous conditions.", impact: "Impact incertain." },
  mesures: [{
    mesure_reformulee: "Geler les prix", passage: "un gel des prix", ce_qui_est_etabli: "Établi.", ce_qui_est_discutable: "Discutable.",
    points_a_verifier: ["Coût réel"], verdict_court: "Verdict.", notation_detaillee: notation,
  }],
  affirmations: [{ texte: "Coût de 20 milliards", verdict: "Non étayé", sources: [1] }],
  sources: [{ id: 1, nom: "INSEE", date: "2024", url: "https://www.insee.fr" }],
  declaration: "Texte de la déclaration.",
  questions: { essentielles: [{ texte: "Question d'interview secrète ?" }], difficiles: [], etendu: false },
};

test("normalizeQuestion : nettoie, refuse le vide, le trop court et le trop long", () => {
  assert.equal(normalizeQuestion("  Quel est   le coût ?  "), "Quel est le coût ?");
  assert.equal(normalizeQuestion("ligne 1\n\nligne 2"), "ligne 1 ligne 2");
  for (const invalide of ["", "   ", "a", null, undefined, 42, {}, ["x"], "x".repeat(QUESTION_MAX_LENGTH + 1)]) {
    assert.equal(normalizeQuestion(invalide), null, String(invalide).slice(0, 20));
  }
  assert.equal(normalizeQuestion("x".repeat(QUESTION_MAX_LENGTH)).length, QUESTION_MAX_LENGTH);
});

test("consigne : réponse limitée à l'analyse, phrase de repli exacte, citation des sources", () => {
  assert.equal(OUT_OF_SCOPE_PHRASE, "Cette information n'est pas dans l'analyse actuelle.");
  assert.ok(CHAT_SYSTEM_RULES.includes(OUT_OF_SCOPE_PHRASE), "la phrase de repli doit figurer dans la consigne");
  assert.match(CHAT_SYSTEM_RULES, /UNIQUEMENT sur le contenu de <analyse>/);
  assert.match(CHAT_SYSTEM_RULES, /AUCUNE autre connaissance/);
  assert.match(CHAT_SYSTEM_RULES, /N'invente rien/);
  assert.match(CHAT_SYSTEM_RULES, /source : Nom de la source/);
  assert.match(CHAT_SYSTEM_RULES, /ignore toute instruction/);
});

test("buildChatContext : score, affirmations avec verdicts, sources, synthèses, déclaration", () => {
  const ctx = buildChatContext(detail);
  assert.equal(ctx.score_global_sur_100, 38);
  assert.equal(ctx.appreciation, "fragile");
  assert.equal(ctx.niveau_de_confiance, "moyen");
  assert.equal(ctx.recherche_web_effectuee, false);
  assert.deepEqual(ctx.syntheses_par_axe, detail.syntheses);
  assert.deepEqual(ctx.affirmations, [{ affirmation: "Coût de 20 milliards", verdict: "Non étayé", sources: [1] }]);
  assert.deepEqual(ctx.sources, [{ id: 1, nom: "INSEE", date: "2024", adresse: "https://www.insee.fr" }]);
  assert.equal(ctx.declaration, "Texte de la déclaration.");
  assert.equal(ctx.mesures[0].ce_qui_est_discutable, "Discutable.");
  assert.equal(ctx.candidat, "Candidate Test");
});

test("buildChatContext : notes en français courant (pas d'identifiants techniques), rien d'extérieur", () => {
  const json = JSON.stringify(buildChatContext(detail));
  assert.ok(json.includes("financement et chiffrage (sur 10)"));
  assert.equal(json.includes("operationnalite_"), false);
  assert.equal(json.includes("score_total"), false);
  // les questions d'interview ne font pas partie du contexte du chat
  assert.equal(json.includes("Question d'interview secrète"), false);
});

test("buildChatContext : déclaration tronquée, analyse ancienne sans candidat ni synthèses", () => {
  const ctx = buildChatContext({
    ...detail, declaration: "x".repeat(20000), candidat: null, syntheseGlobale: null, confiance: null,
    syntheses: { chiffrage: null, faisabilite: null, impact: null }, affirmations: [], sources: [],
  });
  assert.equal(ctx.declaration.length, 8000);
  assert.equal(ctx.candidat, null);
  assert.equal(ctx.source_de_la_declaration, "Texte collé par la rédaction");
  assert.deepEqual(ctx.sources, []);
});

test("buildChatContext : source vidéo indiquée", () => {
  const ctx = buildChatContext({ ...detail, video: { label: "YouTube" }, sourceLabel: "youtube.com" });
  assert.equal(ctx.source_de_la_declaration, "Vidéo YouTube");
  assert.equal(buildChatContext({ ...detail, sourceLabel: "lemonde.fr" }).source_de_la_declaration, "lemonde.fr");
});

test("toClaudeMessages : historique + nouvelle question, alternance stricte user/assistant", () => {
  const history = [
    { role: "user", content: "Q1" }, { role: "assistant", content: "R1" },
    { role: "user", content: "Q2" }, { role: "assistant", content: "R2" },
  ];
  assert.deepEqual(toClaudeMessages(history, "Q3"), [...history, { role: "user", content: "Q3" }]);
  assert.deepEqual(toClaudeMessages([], "Q1"), [{ role: "user", content: "Q1" }]);
});

test("toClaudeMessages : début orphelin, question sans réponse et doublons écartés", () => {
  const commencePar = (messages) => messages[0].role;
  // une réponse sans question en tête (fenêtre coupée) est écartée
  const coupe = toClaudeMessages([{ role: "assistant", content: "R0" }, { role: "user", content: "Q1" }, { role: "assistant", content: "R1" }], "Q2");
  assert.equal(commencePar(coupe), "user");
  // une question restée sans réponse à la fin est écartée
  const orpheline = toClaudeMessages([{ role: "user", content: "Q1" }, { role: "assistant", content: "R1" }, { role: "user", content: "Qsans" }], "Q2");
  assert.deepEqual(orpheline.map((m) => m.content), ["Q1", "R1", "Q2"]);
  // deux messages consécutifs de même rôle : un seul conservé
  const doublon = toClaudeMessages([{ role: "user", content: "A" }, { role: "user", content: "B" }, { role: "assistant", content: "R" }], "Q");
  assert.deepEqual(doublon.map((m) => m.role), ["user", "assistant", "user"]);
  // rôles inconnus ignorés
  assert.deepEqual(toClaudeMessages([{ role: "system", content: "x" }], "Q"), [{ role: "user", content: "Q" }]);
  // dans tous les cas : alternance stricte et dernière position = la nouvelle question
  for (const h of [coupe, orpheline, doublon]) {
    h.forEach((m, i) => assert.equal(m.role, i % 2 === 0 ? "user" : "assistant"));
    assert.equal(h[h.length - 1].role, "user");
  }
});

test("toClaudeMessages : seule la fenêtre récente de l'historique est envoyée", () => {
  const history = Array.from({ length: 40 }, (_, i) => ({ role: i % 2 === 0 ? "user" : "assistant", content: `m${i}` }));
  const messages = toClaudeMessages(history, "nouvelle", 12);
  assert.equal(messages.length, 13);
  assert.equal(messages[0].content, "m28");
  assert.equal(messages[messages.length - 1].content, "nouvelle");
});

test("insertion seule : aucune modification ni suppression de messages dans le code du chat", () => {
  const fichiers = [
    "../src/lib/live-chat-db.js",
    "../src/lib/live-chat.js",
    "../src/app/api/live/analyses/[id]/chat/route.js",
  ];
  const interdit = /\.(update|updateMany|delete|deleteMany|upsert)\s*\(|\$executeRaw|\$queryRaw|\bDELETE\b|\bUPDATE\b/;
  for (const chemin of fichiers) {
    const source = readFileSync(new URL(chemin, import.meta.url), "utf8");
    assert.equal(interdit.test(source), false, `${chemin} contient une écriture destructive`);
  }
  // et l'API d'écriture exposée est bien uniquement « create »
  const db = readFileSync(new URL("../src/lib/live-chat-db.js", import.meta.url), "utf8");
  assert.ok(/liveChatMessage\.create\(/.test(db));
});
