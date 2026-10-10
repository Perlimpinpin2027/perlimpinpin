import test from "node:test";
import assert from "node:assert/strict";
import { declencherRevision, verifierDemande } from "../src/lib/relecture-revision.js";

// Logique de POST /api/relectures/revision (« Envoyer en révision ») :
// contrôles de la demande et appel à l'API GitHub, fetch simulé.

const MAINTENANT = new Date("2026-10-08T12:00:00Z");
const FICHE = { relecture: { titre: "Une mesure" } };
const CLOSE = { reviewDeadline: new Date("2026-10-08T10:00:00Z") };
const OUVERTE = { reviewDeadline: new Date("2026-10-09T10:00:00Z") };

function verifier(params) {
  return verifierDemande({ ficheSlug: "zemmour-rsa", fiche: FICHE, chrono: CLOSE, maintenant: MAINTENANT, ...params });
}

test("demande valide : relecture close, fiche non archivée", () => {
  assert.equal(verifier({}), null);
});

test("refus : slug invalide, fiche absente, relecture non close, déjà archivée", () => {
  assert.equal(verifier({ ficheSlug: "../etc" }).status, 400);
  assert.equal(verifier({ fiche: null }).status, 404);
  assert.equal(verifier({ chrono: null }).status, 409);
  assert.equal(verifier({ chrono: OUVERTE }).status, 409);
  assert.equal(verifier({ fiche: { relecture: { archive: { date: "2026-10-01" } } } }).status, 409);
});

function fauxGitHub({ runs = {}, dispatch = { status: 200, body: { html_url: "https://github.com/run/42" } } } = {}) {
  const appels = [];
  const fetchImpl = async (url, options = {}) => {
    appels.push({ url, options });
    if (url.includes("/runs?")) {
      const status = new URL(url).searchParams.get("status");
      return { ok: true, status: 200, json: async () => ({ workflow_runs: runs[status] || [] }) };
    }
    return { ok: dispatch.status < 300, status: dispatch.status, json: async () => dispatch.body };
  };
  return { appels, fetchImpl };
}

test("déclenchement : workflow_dispatch sur main avec le slug, lien du run renvoyé", async () => {
  const gh = fauxGitHub();
  const res = await declencherRevision({ slug: "zemmour-rsa", token: "t", fetchImpl: gh.fetchImpl });
  assert.deepEqual(res, { lien: "https://github.com/run/42", dejaLance: false });
  const envoi = gh.appels.at(-1);
  assert.match(envoi.url, /actions\/workflows\/revision-relecture\.yml\/dispatches$/);
  assert.equal(envoi.options.method, "POST");
  assert.equal(envoi.options.headers.Authorization, "Bearer t");
  assert.deepEqual(JSON.parse(envoi.options.body), { ref: "main", inputs: { slug: "zemmour-rsa" }, return_run_details: true });
});

test("déclenchement : réponse 204 sans détails, lien vers la page du workflow", async () => {
  const gh = fauxGitHub({ dispatch: { status: 204, body: null } });
  const res = await declencherRevision({ slug: "zemmour-rsa", token: "t", fetchImpl: gh.fetchImpl });
  assert.match(res.lien, /actions\/workflows\/revision-relecture\.yml$/);
});

test("pas de second run si une révision de la même fiche est en cours", async () => {
  const gh = fauxGitHub({
    runs: { in_progress: [{ display_title: "Révision zemmour-rsa", html_url: "https://github.com/run/7" }] },
  });
  const res = await declencherRevision({ slug: "zemmour-rsa", token: "t", fetchImpl: gh.fetchImpl });
  assert.deepEqual(res, { lien: "https://github.com/run/7", dejaLance: true });
  assert.ok(!gh.appels.some((a) => a.url.endsWith("/dispatches")));
});

test("un run d'une autre fiche n'empêche pas l'envoi", async () => {
  const gh = fauxGitHub({ runs: { queued: [{ display_title: "Révision autre-fiche" }] } });
  const res = await declencherRevision({ slug: "zemmour-rsa", token: "t", fetchImpl: gh.fetchImpl });
  assert.equal(res.dejaLance, false);
});

test("erreurs : jeton absent, refus de GitHub", async () => {
  await assert.rejects(declencherRevision({ slug: "x", token: "", fetchImpl: fauxGitHub().fetchImpl }), /GITHUB_DISPATCH_TOKEN/);
  const gh = fauxGitHub({ dispatch: { status: 404, body: {} } });
  await assert.rejects(declencherRevision({ slug: "x", token: "t", fetchImpl: gh.fetchImpl }), /404/);
});
