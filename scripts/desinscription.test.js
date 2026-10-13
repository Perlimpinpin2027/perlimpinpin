import test from "node:test";
import assert from "node:assert/strict";
import { creerJeton, lireJeton, liensDesinscription } from "../src/lib/desinscription-core.js";
import { creerSession } from "../src/lib/relecture-auth-core.js";

// Jeton du lien de désinscription des appels à relecture : signature,
// falsification, format, secret absent. Aucune base, aucun Next.

const SECRET = "secret-de-test-assez-long";

test("jeton valide : on retrouve l'identifiant de l'adhérent", () => {
  const jeton = creerJeton({ secret: SECRET, adherentId: 42 });
  assert.match(jeton, /^42\.[A-Za-z0-9_-]+$/);
  assert.equal(lireJeton({ secret: SECRET, jeton }), 42);
});

test("jeton falsifié : autre identifiant, signature modifiée, autre secret", () => {
  const jeton = creerJeton({ secret: SECRET, adherentId: 42 });
  const [, sig] = jeton.split(".");
  assert.equal(lireJeton({ secret: SECRET, jeton: `43.${sig}` }), null);
  const autreSig = sig.slice(0, -1) + (sig.endsWith("A") ? "B" : "A");
  assert.equal(lireJeton({ secret: SECRET, jeton: `42.${autreSig}` }), null);
  assert.equal(lireJeton({ secret: "un-autre-secret", jeton }), null);
});

test("jeton mal formé refusé", () => {
  for (const jeton of [undefined, null, 42, "", "42", "42.", ".abc", "abc.def", "0.abc", "-1.abc", "42.a.b", "042.abc", "1e3.abc"]) {
    assert.equal(lireJeton({ secret: SECRET, jeton }), null, String(jeton));
  }
});

test("secret absent : création impossible, lecture toujours refusée (fail closed)", () => {
  const jeton = creerJeton({ secret: SECRET, adherentId: 7 });
  for (const secret of [undefined, null, ""]) {
    assert.throws(() => creerJeton({ secret, adherentId: 7 }));
    assert.equal(lireJeton({ secret, jeton }), null);
  }
  assert.throws(() => creerJeton({ secret: SECRET, adherentId: 0 }));
  assert.throws(() => creerJeton({ secret: SECRET, adherentId: 1.5 }));
});

test("préfixe dédié : une signature de session adhérent ne vaut pas jeton de désinscription", () => {
  const session = creerSession({ secret: SECRET, adherentId: 42 });
  const [id, , sig] = session.split(".");
  assert.equal(lireJeton({ secret: SECRET, jeton: `${id}.${sig}` }), null);
});

test("liens : page (bouton) et route POST un clic, même jeton", () => {
  const { page, unClic } = liensDesinscription({ secret: SECRET, adherentId: 42 });
  const jeton = creerJeton({ secret: SECRET, adherentId: 42 });
  assert.equal(page, `https://perlimpinpin.ai/relectures/desinscription?t=${jeton}`);
  assert.equal(unClic, `https://perlimpinpin.ai/api/relectures/desinscription?t=${jeton}`);
  assert.equal(lireJeton({ secret: SECRET, jeton: new URL(page).searchParams.get("t") }), 42);
});
