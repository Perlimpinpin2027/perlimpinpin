import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  EDIT_CODE_MIN_LENGTH,
  EDIT_COOKIE_NAME,
  EDIT_SESSION_MS,
  codeUtilisable,
  codesIdentiques,
  creerSession,
  secretUtilisable,
  sessionValide,
} from "../src/lib/test-auth-core.js";

// Code d'édition de /test : signature et expiration du cookie, comparaison des
// codes, fail-closed. Aucune base de données, aucun Next.

const SECRET = "secret-de-test-tres-long-pour-hmac";
const CODE = "un-code-d-edition-assez-long";
const T0 = 1_800_000_000_000; // instant fixe pour des tests déterministes

test("constantes : cookie ppp_test_edit, 12 h, code de 12 caractères minimum", () => {
  assert.equal(EDIT_COOKIE_NAME, "ppp_test_edit");
  assert.equal(EDIT_SESSION_MS, 12 * 60 * 60 * 1000);
  assert.equal(EDIT_CODE_MIN_LENGTH, 12);
});

test("cookie valide : accepté jusqu'à l'expiration", () => {
  const valeur = creerSession({ secret: SECRET, code: CODE, maintenant: T0 });
  assert.equal(sessionValide({ secret: SECRET, code: CODE, valeur, maintenant: T0 }), true);
  assert.equal(
    sessionValide({ secret: SECRET, code: CODE, valeur, maintenant: T0 + EDIT_SESSION_MS - 1 }),
    true,
  );
});

test("cookie expiré : refusé (à la seconde près, et bien après)", () => {
  const valeur = creerSession({ secret: SECRET, code: CODE, maintenant: T0 });
  for (const maintenant of [T0 + EDIT_SESSION_MS, T0 + EDIT_SESSION_MS + 1, T0 + 10 * EDIT_SESSION_MS]) {
    assert.equal(sessionValide({ secret: SECRET, code: CODE, valeur, maintenant }), false, String(maintenant));
  }
});

test("cookie falsifié : signature modifiée, expiration prolongée, morceaux inventés", () => {
  const valeur = creerSession({ secret: SECRET, code: CODE, maintenant: T0 });
  const [expiration, signature] = valeur.split(".");

  // Signature altérée d'un seul caractère.
  const alteree = `${expiration}.${signature.slice(0, -1)}${signature.endsWith("A") ? "B" : "A"}`;
  assert.equal(sessionValide({ secret: SECRET, code: CODE, valeur: alteree, maintenant: T0 }), false);

  // On garde la signature mais on prolonge la date d'expiration : refusé.
  const prolongee = `${Number(expiration) + 999_999_999}.${signature}`;
  assert.equal(sessionValide({ secret: SECRET, code: CODE, valeur: prolongee, maintenant: T0 }), false);

  // Signature de longueur différente (timingSafeEqual lèverait une erreur : on doit refuser proprement).
  assert.equal(sessionValide({ secret: SECRET, code: CODE, valeur: `${expiration}.court`, maintenant: T0 }), false);

  for (const valeurInvalide of ["", ".", "abc", `${expiration}`, `${expiration}.`, `.${signature}`, `${expiration}.${signature}.x`, "1e12.zzz", "-5.zzz", undefined, null, 42, {}]) {
    assert.equal(
      sessionValide({ secret: SECRET, code: CODE, valeur: valeurInvalide, maintenant: T0 }),
      false,
      String(valeurInvalide),
    );
  }
});

test("mauvais secret : un cookie signé avec un autre secret est refusé", () => {
  const valeur = creerSession({ secret: SECRET, code: CODE, maintenant: T0 });
  assert.equal(sessionValide({ secret: "un-autre-secret", code: CODE, valeur, maintenant: T0 }), false);
});

test("changer TEST_EDIT_CODE invalide les cookies déjà émis", () => {
  const valeur = creerSession({ secret: SECRET, code: CODE, maintenant: T0 });
  assert.equal(
    sessionValide({ secret: SECRET, code: "un-nouveau-code-tout-neuf", valeur, maintenant: T0 }),
    false,
  );
});

test("code trop court ou absent : personne ne s'authentifie (échec fermé)", () => {
  assert.equal(codeUtilisable("a".repeat(EDIT_CODE_MIN_LENGTH - 1)), false);
  assert.equal(codeUtilisable("a".repeat(EDIT_CODE_MIN_LENGTH)), true);
  for (const code of ["", undefined, null, 123456789012, {}]) {
    assert.equal(codeUtilisable(code), false, String(code));
  }

  // Impossible de fabriquer un cookie avec un code trop court ou sans secret…
  assert.throws(() => creerSession({ secret: SECRET, code: "court", maintenant: T0 }));
  assert.throws(() => creerSession({ secret: "", code: CODE, maintenant: T0 }));
  assert.throws(() => creerSession({ secret: undefined, code: CODE, maintenant: T0 }));

  // … et même un cookie « bien signé » avec ce code trop court est refusé.
  const forge = creerSession({ secret: SECRET, code: "a".repeat(EDIT_CODE_MIN_LENGTH), maintenant: T0 });
  assert.equal(sessionValide({ secret: SECRET, code: "court", valeur: forge, maintenant: T0 }), false);
  assert.equal(sessionValide({ secret: SECRET, code: undefined, valeur: forge, maintenant: T0 }), false);
  assert.equal(sessionValide({ secret: "", code: CODE, valeur: forge, maintenant: T0 }), false);
  assert.equal(sessionValide({ secret: undefined, code: CODE, valeur: forge, maintenant: T0 }), false);
});

test("secretUtilisable : non vide obligatoire", () => {
  assert.equal(secretUtilisable("x"), true);
  for (const secret of ["", undefined, null, 42]) assert.equal(secretUtilisable(secret), false);
});

test("codesIdentiques : égalité stricte, longueurs différentes sans erreur", () => {
  assert.equal(codesIdentiques(CODE, CODE), true);
  assert.equal(codesIdentiques(CODE, `${CODE} `), false);
  assert.equal(codesIdentiques("court", CODE), false);
  assert.equal(codesIdentiques(CODE.toUpperCase(), CODE), false);
  assert.equal(codesIdentiques("", CODE), false);
  assert.equal(codesIdentiques(undefined, CODE), false);
  assert.equal(codesIdentiques(CODE, null), false);
});

// Garde-fous sur le code : les fichiers de /test restent indépendants de /live, et le
// mode édition est protégé côté serveur (pas seulement par des boutons cachés).
test("/test n'utilise ni next-auth, ni LiveUser, ni getLiveUser", () => {
  for (const chemin of [
    "../src/lib/test-auth-core.js",
    "../src/lib/test-auth.js",
    "../src/lib/test-publier.js",
    "../src/app/test/actions.js",
    "../src/app/test/EditorBar.js",
    "../src/app/test/PublishBox.js",
    "../src/app/test/page.js",
    "../src/app/test/[id]/page.js",
  ]) {
    const source = readFileSync(new URL(chemin, import.meta.url), "utf8");
    assert.doesNotMatch(source, /next-auth|@\/auth|live-auth|live-users|getLiveUser|LiveUser/, chemin);
  }
});

test("le cookie est httpOnly, sameSite strict, limité à /test", () => {
  const source = readFileSync(new URL("../src/app/test/actions.js", import.meta.url), "utf8");
  assert.match(source, /httpOnly:\s*true/);
  assert.match(source, /sameSite:\s*"strict"/);
  assert.match(source, /path:\s*"\/test"/);
  assert.match(source, /secure:\s*process\.env\.NODE_ENV === "production"/);
});
