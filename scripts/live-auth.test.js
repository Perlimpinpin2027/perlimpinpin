import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  PASSWORD_MIN_LENGTH,
  generateTemporaryPassword,
  hashPassword,
  normalizeEmail,
  passwordProblem,
  verifyPassword,
} from "../src/lib/live-password.js";
import {
  DEFAULT_SCOPE,
  LEGACY_AUTHOR_LABEL,
  authorLabel,
  normalizeScope,
  scopeWhere,
} from "../src/lib/live-scope.js";

// Comptes individuels de /live : mots de passe hachés, portée « Mes analyses » /
// « Toutes les analyses », et garde-fous sur le code (toute route protégée passe par
// getLiveUser, les listes exigent un journaliste).

test("normalizeEmail : minuscules, espaces retirés, formats invalides refusés", () => {
  assert.equal(normalizeEmail("  Arno.F@Exemple.FR "), "arno.f@exemple.fr");
  for (const invalide of ["", "   ", "sans-arobase", "a@b", "a b@c.fr", "@c.fr", null, undefined, 42, {}, ["a@b.fr"], `${"a".repeat(250)}@b.fr`]) {
    assert.equal(normalizeEmail(invalide), null, String(invalide).slice(0, 20));
  }
});

test("passwordProblem : longueur minimale et limite bcrypt (72 octets)", () => {
  assert.equal(passwordProblem("a".repeat(PASSWORD_MIN_LENGTH)), null);
  assert.match(passwordProblem("court"), /au moins/);
  assert.match(passwordProblem(undefined), /au moins/);
  assert.match(passwordProblem("a".repeat(73)), /trop long/);
  assert.match(passwordProblem("é".repeat(40)), /trop long/); // 80 octets
});

test("mot de passe : haché (jamais en clair), vérifié, et adresse inconnue indiscernable", async () => {
  const hash = await hashPassword("Mot de passe solide 2026");
  assert.match(hash, /^\$2[aby]\$12\$/);
  assert.equal(hash.includes("solide"), false);
  assert.notEqual(await hashPassword("Mot de passe solide 2026"), hash); // sel aléatoire
  assert.equal(await verifyPassword("Mot de passe solide 2026", hash), true);
  assert.equal(await verifyPassword("Mot de passe solide 2027", hash), false);
  // compte introuvable (pas de hachage), saisie vide ou démesurée : toujours faux
  assert.equal(await verifyPassword("Mot de passe solide 2026", null), false);
  assert.equal(await verifyPassword("", hash), false);
  assert.equal(await verifyPassword(undefined, hash), false);
  assert.equal(await verifyPassword("x".repeat(5000), hash), false);
});

test("generateTemporaryPassword : longueur, alphabet sans ambiguïté, aléatoire", () => {
  const a = generateTemporaryPassword();
  const b = generateTemporaryPassword();
  assert.equal(a.length, 16);
  assert.match(a, /^[abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/);
  assert.notEqual(a, b);
  assert.equal(passwordProblem(a), null);
});

test("portée : « mes » par défaut, seule la valeur exacte « toutes » ouvre l'équipe", () => {
  assert.equal(DEFAULT_SCOPE, "mes");
  assert.equal(normalizeScope("toutes"), "toutes");
  for (const autre of [undefined, null, "", "mes", "TOUTES", "all", 1, {}]) assert.equal(normalizeScope(autre), "mes");
  assert.deepEqual(scopeWhere("mes", 7), { auteurId: 7 });
  assert.deepEqual(scopeWhere(undefined, 7), { auteurId: 7 });
  assert.deepEqual(scopeWhere("toutes", 7), {});
});

test("portée : sans identifiant de journaliste valide, aucune liste n'est jamais construite", () => {
  for (const scope of ["mes", "toutes", undefined]) {
    for (const userId of [undefined, null, 0, -1, 1.5, "1", NaN]) {
      assert.throws(() => scopeWhere(scope, userId), /Identifiant de journaliste requis/, `${scope}/${String(userId)}`);
    }
  }
});

test("auteur : nom du journaliste, ou libellé « historique » pour une analyse sans auteur", () => {
  assert.equal(authorLabel({ nom: "Alice Test" }), "Alice Test");
  assert.equal(LEGACY_AUTHOR_LABEL, "Équipe éditoriale (historique)");
  for (const vide of [null, undefined, {}, { nom: "" }]) assert.equal(authorLabel(vide), LEGACY_AUTHOR_LABEL);
});

function sourceFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(js|jsx)$/.test(name) ? [path] : [];
  });
}

test("garde-fou : plus aucune trace de l'ancien mot de passe partagé, tout /live passe par getLiveUser", () => {
  const files = sourceFiles("src");
  const read = (path) => readFileSync(path, "utf8");
  assert.equal(existsSync("src/lib/live-session.js"), false, "l'ancien module de session doit avoir disparu");
  for (const path of files) {
    const source = read(path);
    assert.equal(/LIVE_ACCESS_PASSWORD|LIVE_SESSION_SECRET|verifySessionToken|isValidPassword/.test(source), false, path);
  }
  // chaque route API et page protégée de /live vérifie la session via getLiveUser
  const protegees = files.filter(
    (path) =>
      /src[\\/]app[\\/]api[\\/]live[\\/].*route\.js$/.test(path) ||
      /src[\\/]app[\\/]live[\\/](page|analyses[\\/].*page)\.js$/.test(path),
  );
  assert.ok(protegees.length >= 9, `routes/pages protégées trouvées : ${protegees.length}`);
  for (const path of protegees) assert.match(read(path), /getLiveUser\(\)/, path);
});

test("garde-fou : les requêtes de listes sont toutes bornées par la portée et par l'utilisateur", () => {
  const source = readFileSync("src/lib/live-history.js", "utf8");
  // listes, recherche et dossiers passent par scopeWhere (qui exige un journaliste)
  assert.equal((source.match(/scopeWhere\(/g) ?? []).length >= 3, true);
  // plus aucune lecture ni écriture de l'ancien favori partagé
  assert.equal(/(where|data):\s*\{[^}]*\bfavori\b\s*[:,}]/.test(source), false);
  assert.match(source, /liveFavori\.(upsert|deleteMany)/);
  // le favori d'une carte ne concerne que le journaliste connecté
  assert.match(source, /favoris:\s*\{\s*where:\s*\{\s*userId/);
});

test("garde-fou : cookie de session httpOnly, secure et sameSite strict ; routes /api/auth non exposées", () => {
  const config = readFileSync("src/auth.js", "utf8");
  assert.match(config, /httpOnly:\s*true/);
  assert.match(config, /secure:\s*true/);
  assert.match(config, /sameSite:\s*"strict"/);
  assert.match(config, /strategy:\s*"jwt"/);
  assert.equal(existsSync("src/app/api/auth"), false);
});
