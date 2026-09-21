import test from "node:test";
import assert from "node:assert/strict";
import { loginUrl, postLoginPath, safeLivePath } from "../src/lib/live-redirect.js";

// Retour après connexion : uniquement des pages internes de /live, jamais une
// adresse externe (open redirect), jamais la page de connexion (boucle).

test("safeLivePath : pages internes de /live acceptées, paramètres conservés, ancre retirée", () => {
  assert.equal(safeLivePath("/live"), "/live");
  assert.equal(safeLivePath("/live/analyses/12"), "/live/analyses/12");
  assert.equal(safeLivePath("/live/analyses/12/imprimer?apercu=1"), "/live/analyses/12/imprimer?apercu=1");
  assert.equal(safeLivePath("/live?q=le%20pen"), "/live?q=le%20pen");
  assert.equal(safeLivePath("/live?vue=favoris"), "/live?vue=favoris");
  assert.equal(safeLivePath("/live/analyses/12#questions"), "/live/analyses/12");
});

test("safeLivePath : adresses externes et schémas dangereux refusés (open redirect)", () => {
  for (const attaque of [
    "https://evil.com",
    "http://evil.com/live/analyses/1",
    "//evil.com",
    "//evil.com/live",
    "///evil.com",
    "/\\evil.com",
    "\\\\evil.com",
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "evil.com",
    "live/analyses/1",
    "https://localhost:3000/live",
  ]) {
    assert.equal(safeLivePath(attaque), null, attaque);
  }
});

test("safeLivePath : hors de /live refusé, y compris par détour (..) ou faux préfixe", () => {
  for (const chemin of [
    "/",
    "/declarations",
    "/api/live/analyze",
    "/liveevil",
    "/live-evil",
    "/LIVE/analyses/1",
    "/live/../declarations",
    "/live/%2e%2e/declarations",
    "/live/analyses/../../api/x",
    "/live/./../x",
  ]) {
    assert.equal(safeLivePath(chemin), null, chemin);
  }
});

test("safeLivePath : jamais la page de connexion (boucle)", () => {
  for (const chemin of ["/live/login", "/live/login?next=/live", "/live/login/", "/live/login/x", "/live/analyses/../login"]) {
    assert.equal(safeLivePath(chemin), null, chemin);
  }
});

test("safeLivePath : caractères de contrôle, entrées vides ou trop longues refusés", () => {
  for (const entree of [
    "/live\r\nLocation: https://evil.com",
    "/live/analyses/1\n",
    "/live\t/x",
    "/live/analyses/" + String.fromCharCode(0) + "1",
    "/live/analyses/\\..\\x",
    "",
    "/",
    null,
    undefined,
    42,
    {},
    ["/live"],
    "/live/" + "a".repeat(600),
  ]) {
    assert.equal(safeLivePath(entree), null, String(entree).slice(0, 40));
  }
});

test("safeLivePath : le résultat est reconstruit (normalisé), jamais la saisie brute", () => {
  assert.equal(safeLivePath("/live/analyses/./12"), "/live/analyses/12");
  assert.equal(safeLivePath("/live//analyses"), "/live//analyses");
  // Une redirection ne peut jamais contenir un hôte
  for (const entree of ["/live/x", "/live?a=https://evil.com", "/live/analyses/1?next=//evil.com"]) {
    const sortie = safeLivePath(entree);
    assert.ok(sortie.startsWith("/live"), sortie);
    assert.equal(new URL(sortie, "https://site.test").origin, "https://site.test");
  }
});

test("loginUrl : conserve la destination, encodée ; retombe sur /live/login sinon", () => {
  assert.equal(loginUrl("/live/analyses/12"), "/live/login?next=%2Flive%2Fanalyses%2F12");
  assert.equal(loginUrl("/live?q=le pen"), "/live/login?next=%2Flive%3Fq%3Dle%2520pen");
  assert.equal(loginUrl("/live"), "/live/login");
  assert.equal(loginUrl("/live/login"), "/live/login");
  assert.equal(loginUrl("https://evil.com"), "/live/login");
  assert.equal(loginUrl(undefined), "/live/login");
});

test("loginUrl -> postLoginPath : aller-retour fidèle, y compris paramètres accentués ou encodés", () => {
  for (const chemin of ["/live/analyses/12", "/live/analyses/12/imprimer?apercu=1", "/live?q=%C3%A9conomie&vue=favoris", "/live?dossier=sante"]) {
    const url = new URL(loginUrl(chemin), "https://site.test");
    assert.equal(postLoginPath(url.searchParams.get("next")), chemin, chemin);
  }
});

test("postLoginPath : /live par défaut, ou si la destination est refusée", () => {
  assert.equal(postLoginPath(null), "/live");
  assert.equal(postLoginPath(undefined), "/live");
  assert.equal(postLoginPath(""), "/live");
  assert.equal(postLoginPath("https://evil.com"), "/live");
  assert.equal(postLoginPath("//evil.com"), "/live");
  assert.equal(postLoginPath("/live/login"), "/live");
  assert.equal(postLoginPath("/live/analyses/7"), "/live/analyses/7");
});
