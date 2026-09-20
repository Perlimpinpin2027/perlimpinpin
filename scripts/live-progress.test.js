import test from "node:test";
import assert from "node:assert/strict";
import { PROGRESS_CEILING, messageIndex, simulatedProgress } from "../src/lib/live-progress.js";

// Courbe de la barre de progression simulée de /live.

test("simulatedProgress : part de 0 et ne dépend que du temps", () => {
  assert.equal(simulatedProgress(0), 0);
  assert.equal(simulatedProgress(-5), 0);
  assert.equal(simulatedProgress(7), simulatedProgress(7));
});

test("simulatedProgress : environ 60 % en quelques secondes", () => {
  const p = simulatedProgress(5);
  assert.ok(p >= 55 && p <= 68, `attendu ~60 % à 5 s, obtenu ${p.toFixed(1)}`);
  assert.ok(simulatedProgress(2) > 30, "la barre doit démarrer vite");
});

test("simulatedProgress : strictement croissante jusqu'au délai maximal (100 s), jamais décroissante ensuite", () => {
  let previous = simulatedProgress(0);
  for (let t = 0.5; t <= 400; t += 0.5) {
    const current = simulatedProgress(t);
    if (t <= 100) assert.ok(current > previous, `pas croissante à ${t} s`);
    else assert.ok(current >= previous, `décroissante à ${t} s`);
    previous = current;
  }
});

test("simulatedProgress : ralentit fortement après la phase rapide", () => {
  const gainEarly = simulatedProgress(15) - simulatedProgress(5);
  const gainLate = simulatedProgress(45) - simulatedProgress(35);
  assert.ok(gainLate < gainEarly / 2, `gain tardif ${gainLate.toFixed(2)} vs précoce ${gainEarly.toFixed(2)}`);
});

test("simulatedProgress : n'atteint jamais le plafond (90-95 %) même après très longtemps", () => {
  assert.ok(PROGRESS_CEILING >= 90 && PROGRESS_CEILING <= 95);
  for (const t of [30, 60, 90, 100, 300, 3600]) {
    assert.ok(simulatedProgress(t) < PROGRESS_CEILING, `${t} s : ${simulatedProgress(t)}`);
  }
  assert.ok(simulatedProgress(90) > 88, "à 90 s (délai maximal) la barre est proche du plafond");
});

test("messageIndex : avance dans la liste puis reste sur le dernier message", () => {
  assert.equal(messageIndex(0, 6), 0);
  assert.equal(messageIndex(3.4, 6), 0);
  assert.equal(messageIndex(3.5, 6), 1);
  assert.equal(messageIndex(10.6, 6), 3);
  assert.equal(messageIndex(500, 6), 5);
  assert.equal(messageIndex(-3, 6), 0);
  assert.equal(messageIndex(10, 0), 0);
});
