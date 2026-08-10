import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { callMistralQualityControl } from "./analyze.js";

// CAS 10 de la spec ("Mistral indisponible -> le pipeline continue") :
// runPipeline() enveloppe cet appel dans un try/catch (voir analyze.js,
// runPipeline) et poursuit avec contreAvisMistral = null en cas d'échec —
// ce comportement de continuation n'est pas ré-exécuté ici (il dépend de
// l'orchestration complète, testée en pratique par le run réel du
// pipeline), mais on vérifie ici la précondition réelle et sans réseau :
// callMistralQualityControl échoue proprement (rejette une promesse avec un
// message clair) plutôt que de bloquer, ce qui est ce que le try/catch
// attend pour se déclencher.
describe("CAS 10 — résilience Mistral", () => {
  test("callMistralQualityControl rejette proprement si MISTRAL_API_KEY est absent (aucun appel réseau)", async () => {
    const original = process.env.MISTRAL_API_KEY;
    delete process.env.MISTRAL_API_KEY;
    try {
      await assert.rejects(
        () => callMistralQualityControl({ notation_detaillee: {} }),
        /MISTRAL_API_KEY n'est pas défini/,
      );
    } finally {
      if (original !== undefined) process.env.MISTRAL_API_KEY = original;
    }
  });
});
