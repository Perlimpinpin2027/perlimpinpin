import test from "node:test";
import assert from "node:assert/strict";
import { avertissementBase, estProduction, hoteDe } from "./lib/garde-fou-base.js";

// Garde-fou des scripts d'écriture : la production est reconnue par son hôte
// Neon fixe, jamais par le contenu du .env.

test("production : hôte direct et pooler de ep-shiny-leaf", () => {
  assert.equal(estProduction("ep-shiny-leaf-as4ydnda.c-4.eu-central-1.aws.neon.tech"), true);
  assert.equal(estProduction("ep-shiny-leaf-as4ydnda-pooler.c-4.eu-central-1.aws.neon.tech"), true);
  assert.equal(estProduction("EP-SHINY-LEAF-AS4YDNDA-POOLER.c-4.eu-central-1.aws.neon.tech"), true);
});

test("copie / test : tout autre hôte", () => {
  assert.equal(estProduction("ep-delicate-sky-ask141qb.c-4.eu-central-1.aws.neon.tech"), false);
  assert.equal(estProduction("ep-young-thunder-ascpun2r-pooler.c-4.eu-central-1.aws.neon.tech"), false);
  // un hôte qui commence pareil mais n'est pas le même endpoint
  assert.equal(estProduction("ep-shiny-leaf-as4ydnda2.c-4.eu-central-1.aws.neon.tech"), false);
  assert.equal(estProduction("ep-shiny-leaf-as4ydnda-copie.c-4.eu-central-1.aws.neon.tech"), false);
  assert.equal(estProduction(null), false);
});

test("avertissement affiché", () => {
  const prod = avertissementBase(hoteDe("postgresql://u:p@ep-shiny-leaf-as4ydnda-pooler.c-4.eu-central-1.aws.neon.tech/neondb"));
  assert.match(prod.join("\n"), /PRODUCTION/);
  const copie = avertissementBase("ep-delicate-sky-ask141qb.c-4.eu-central-1.aws.neon.tech");
  assert.match(copie.join("\n"), /COPIE \/ TEST/);
  assert.doesNotMatch(copie.join("\n"), /⚠  PRODUCTION/);
});
