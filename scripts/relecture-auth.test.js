import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  RELECTURE_COOKIE_NAME,
  RELECTURE_SESSION_MS,
  cheminRelectureProtege,
  codeAdminValide,
  lectureComiteAutorisee,
  creerSession,
  lireSession,
  optionsCookie,
  secretUtilisable,
} from "../src/lib/relecture-auth-core.js";
import { creerSession as creerSessionTest } from "../src/lib/test-auth-core.js";

// Session adhérent de /relectures : signature et expiration du cookie,
// fail-closed. Aucune base de données, aucun Next.

const SECRET = "secret-de-test-tres-long-pour-hmac";
const T0 = 1_800_000_000_000; // instant fixe pour des tests déterministes

test("constantes : cookie relecture_auth, 30 jours", () => {
  assert.equal(RELECTURE_COOKIE_NAME, "relecture_auth");
  assert.equal(RELECTURE_SESSION_MS, 30 * 24 * 60 * 60 * 1000);
});

test("options du cookie : httpOnly, secure, sameSite lax, path /, 30 jours", () => {
  assert.deepEqual(optionsCookie(), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
});

test("cookie valide : accepté jusqu'à l'expiration, renvoie l'adhérent et la date d'émission", () => {
  const valeur = creerSession({ secret: SECRET, adherentId: 42, maintenant: T0 });
  assert.match(valeur, /^42\.\d+\.[A-Za-z0-9_-]+$/);
  assert.deepEqual(lireSession({ secret: SECRET, valeur, maintenant: T0 }), { adherentId: 42, emiseLe: T0 });
  assert.deepEqual(
    lireSession({ secret: SECRET, valeur, maintenant: T0 + RELECTURE_SESSION_MS - 1 }),
    { adherentId: 42, emiseLe: T0 },
  );
});

test("cookie expiré : refusé (à la milliseconde près, et bien après)", () => {
  const valeur = creerSession({ secret: SECRET, adherentId: 42, maintenant: T0 });
  for (const maintenant of [T0 + RELECTURE_SESSION_MS, T0 + RELECTURE_SESSION_MS + 1, T0 + 10 * RELECTURE_SESSION_MS]) {
    assert.equal(lireSession({ secret: SECRET, valeur, maintenant }), null, String(maintenant));
  }
});

test("cookie falsifié : signature altérée, identifiant changé, expiration prolongée", () => {
  const valeur = creerSession({ secret: SECRET, adherentId: 42, maintenant: T0 });
  const [id, expiration, signature] = valeur.split(".");

  const alteree = `${id}.${expiration}.${signature.slice(0, -1)}${signature.endsWith("A") ? "B" : "A"}`;
  assert.equal(lireSession({ secret: SECRET, valeur: alteree, maintenant: T0 }), null);

  // Se faire passer pour un autre adhérent en gardant la signature : refusé.
  assert.equal(lireSession({ secret: SECRET, valeur: `43.${expiration}.${signature}`, maintenant: T0 }), null);

  // Prolonger la session en gardant la signature : refusé.
  assert.equal(
    lireSession({ secret: SECRET, valeur: `${id}.${Number(expiration) + 999_999_999}.${signature}`, maintenant: T0 }),
    null,
  );

  // Signé avec un autre secret : refusé.
  const autre = creerSession({ secret: "un-autre-secret", adherentId: 42, maintenant: T0 });
  assert.equal(lireSession({ secret: SECRET, valeur: autre, maintenant: T0 }), null);

  // Signature fabriquée sans le préfixe « relecture| » (autre usage du même secret) : refusée.
  const sansPrefixe = createHmac("sha256", SECRET).update(`42|${expiration}`).digest("base64url");
  assert.equal(lireSession({ secret: SECRET, valeur: `42.${expiration}.${sansPrefixe}`, maintenant: T0 }), null);
});

test("un cookie d'édition /test (même AUTH_SECRET) n'ouvre pas de session adhérent", () => {
  const cookieTest = creerSessionTest({ secret: SECRET, code: "un-code-d-edition-assez-long", maintenant: T0 });
  assert.equal(lireSession({ secret: SECRET, valeur: cookieTest, maintenant: T0 }), null);
  assert.equal(lireSession({ secret: SECRET, valeur: `1.${cookieTest}`, maintenant: T0 }), null);
});

test("cookie mal formé : refusé proprement, sans exception", () => {
  const valeur = creerSession({ secret: SECRET, adherentId: 42, maintenant: T0 });
  const [id, expiration, signature] = valeur.split(".");
  for (const valeurInvalide of [
    "",
    ".",
    "..",
    "abc",
    `${id}.${expiration}`,
    `${id}.${expiration}.`,
    `${id}.${expiration}.court`,
    `.${expiration}.${signature}`,
    `${id}..${signature}`,
    `${valeur}.x`,
    `0.${expiration}.${signature}`,
    `-1.${expiration}.${signature}`,
    `042.${expiration}.${signature}`,
    `4e1.${expiration}.${signature}`,
    `${id}.1e12.${signature}`,
    `${id}.-5.${signature}`,
    `99999999999999999.${expiration}.${signature}`,
    undefined,
    null,
    42,
    {},
  ]) {
    assert.equal(lireSession({ secret: SECRET, valeur: valeurInvalide, maintenant: T0 }), null, String(valeurInvalide));
  }
});

test("secret absent ou vide : aucune session ne peut être créée ni lue (fail closed)", () => {
  const valeur = creerSession({ secret: SECRET, adherentId: 42, maintenant: T0 });
  for (const secret of [undefined, null, "", 0]) {
    assert.equal(secretUtilisable(secret), false);
    assert.equal(lireSession({ secret, valeur, maintenant: T0 }), null);
    assert.throws(() => creerSession({ secret, adherentId: 42, maintenant: T0 }));
  }
});

test("identifiant d'adhérent invalide : pas de session créée", () => {
  for (const adherentId of [0, -1, 1.5, "42", null, undefined, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => creerSession({ secret: SECRET, adherentId, maintenant: T0 }), String(adherentId));
  }
});

test("proxy : tout /relectures est protégé, sauf connexion, inscription et déconnexion", () => {
  for (const chemin of [
    "/relectures",
    "/relectures/",
    "/relectures/index.html",
    "/relectures/index",
    "/Relectures",
    "/RELECTURES/INDEX.HTML",
    "/relectures/connexion/../index.html",
    "/relectures/autre",
    "/relectures/connexion-bis",
    undefined,
  ]) {
    assert.equal(cheminRelectureProtege(chemin), true, String(chemin));
  }
  for (const chemin of [
    "/relectures/connexion",
    "/relectures/connexion/",
    "/relectures/inscription",
    "/relectures/deconnexion",
    "/live",
    "/api/relectures/comments",
    "/relecturesx",
  ]) {
    assert.equal(cheminRelectureProtege(chemin), false, chemin);
  }
});

const CODE_ADMIN = "code-comite-assez-long";

test("lecture comité : bon code en GET ou HEAD sur la page seule", () => {
  for (const methode of ["GET", "HEAD"]) {
    for (const pathname of ["/relectures", "/relectures/", "/relectures/index.html", "/RELECTURES/Index.html"]) {
      assert.equal(
        lectureComiteAutorisee({ methode, pathname, codeRecu: CODE_ADMIN, codeAdmin: CODE_ADMIN }),
        true,
        `${methode} ${pathname}`,
      );
    }
  }
});

test("lecture comité : mauvais code, code absent ou code serveur trop court → refus (redirection)", () => {
  for (const codeRecu of ["mauvais-code-assez-long", "", undefined, null, CODE_ADMIN + " ", CODE_ADMIN.slice(0, -1)]) {
    assert.equal(lectureComiteAutorisee({ methode: "GET", pathname: "/relectures", codeRecu, codeAdmin: CODE_ADMIN }), false, String(codeRecu));
  }
  for (const codeAdmin of [undefined, "", "court"]) {
    assert.equal(lectureComiteAutorisee({ methode: "GET", pathname: "/relectures", codeRecu: codeAdmin, codeAdmin }), false, String(codeAdmin));
  }
  assert.equal(codeAdminValide(CODE_ADMIN, CODE_ADMIN), true);
});

test("lecture comité : le code n'ouvre ni l'écriture, ni les autres chemins, ni l'API", () => {
  for (const methode of ["POST", "PUT", "DELETE", "PATCH", "OPTIONS", undefined]) {
    assert.equal(lectureComiteAutorisee({ methode, pathname: "/relectures", codeRecu: CODE_ADMIN, codeAdmin: CODE_ADMIN }), false, String(methode));
  }
  for (const pathname of ["/relectures/autre", "/relectures/index", "/relectures/connexion", "/api/relectures/comments", "/api/relectures/chrono", "/live", undefined]) {
    assert.equal(lectureComiteAutorisee({ methode: "GET", pathname, codeRecu: CODE_ADMIN, codeAdmin: CODE_ADMIN }), false, String(pathname));
  }
});
