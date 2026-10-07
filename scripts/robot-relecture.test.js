import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { RelectureError, instantParis, redigerMail } from "./relecture.js";
import {
  attendreFicheEnLigne, fichesAbsentes, fichiersHorsPerimetre, nomsDeFiches, resumeMarkdown, verifierFin,
} from "./robot-relecture.js";

// Robot « Mettre en relecture » (aucun accès réseau : fetch simulé, attente instantanée).

const CODE = "code-comite-secret-123";

function capture() {
  const lignes = [];
  return { log: (s) => lignes.push(String(s)), texte: () => lignes.join("\n") };
}

// Réponses successives de la page /relectures/ ; la dernière se répète.
function fausseFetch(reponses) {
  const appels = [];
  const fetchFn = async (url, opts) => {
    appels.push({ url, opts });
    const r = reponses[Math.min(appels.length - 1, reponses.length - 1)];
    if (r instanceof Error) throw r;
    return { ok: r.status === 200, status: r.status, redirected: Boolean(r.redirige), url: r.redirige ?? url, text: async () => r.html ?? "" };
  };
  return { fetchFn, appels };
}

// ---------- nomsDeFiches ----------

test("nomsDeFiches : espaces multiples, .json facultatif, doublons retirés", () => {
  assert.deepEqual(nomsDeFiches("  lepen-budget  zemmour-retraites.json\nlepen-budget "), ["lepen-budget", "zemmour-retraites"]);
});

test("nomsDeFiches : vide ou nom invalide refusé", () => {
  assert.throws(() => nomsDeFiches(""), /Aucune fiche/);
  assert.throws(() => nomsDeFiches(undefined), RelectureError);
  assert.throws(() => nomsDeFiches("ok Zemmour fiche_v2"), /Nom de fiche invalide : Zemmour, fiche_v2/);
  assert.throws(() => nomsDeFiches("../secret"), RelectureError);
});

test("fichesAbsentes : seules les fiches manquantes du dossier de dépôt", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "a-relire-test-"));
  writeFileSync(path.join(dir, "presente.json"), "{}");
  assert.deepEqual(fichesAbsentes(["presente", "absente"], dir), ["absente"]);
  rmSync(dir, { recursive: true });
});

// ---------- verifierFin ----------

test("verifierFin : vide = pas de chrono, heure de journée acceptée", () => {
  const now = instantParis(2026, 10, 7, 10, 0);
  assert.equal(verifierFin("", now), null);
  assert.equal(verifierFin("   ", now), null);
  assert.equal(verifierFin(undefined, now), null);
  assert.equal(verifierFin(" 20:00 ", now), "20:00");
});

test("verifierFin : format invalide refusé", () => {
  assert.throws(() => verifierFin("20h", instantParis(2026, 10, 7, 10, 0)), /Heure de fin invalide/);
});

test("verifierFin : clôture de nuit refusée avec une heure proposée, sans choix automatique", () => {
  const now = instantParis(2026, 10, 7, 10, 0);
  assert.throws(() => verifierFin("23:00", now), (e) => {
    assert.ok(e instanceof RelectureError);
    assert.match(e.message, /tomberait la nuit/);
    assert.match(e.message, /relance le workflow avec fin = 20:00/);
    return true;
  });
  // 06:00 -> demain matin, proposition 09:00.
  assert.throws(() => verifierFin("06:00", now), /fin = 09:00/);
});

// ---------- fichiersHorsPerimetre ----------

test("fichiersHorsPerimetre : seuls les dossiers de relecture sont autorisés", () => {
  const fichiers = [
    "data/relectures/a.json", "public/relectures/index.html", "data/a-relire/a.json",
    "package.json", "data/relectures-bis/x.json", "scripts/relecture.js", "",
  ];
  assert.deepEqual(fichiersHorsPerimetre(fichiers), ["package.json", "data/relectures-bis/x.json", "scripts/relecture.js"]);
  assert.deepEqual(fichiersHorsPerimetre(["data\\relectures\\a.json"]), []);
});

// ---------- attendreFicheEnLigne ----------

test("attendreFicheEnLigne : réessaie toutes les 20 s jusqu'à ce que la fiche apparaisse", async () => {
  const { fetchFn, appels } = fausseFetch([
    { status: 200, html: "<div data-fiche=\"autre\">" },
    { status: 503 },
    new Error("ECONNRESET"),
    { status: 200, html: "<div data-fiche=\"ma-fiche\">" },
  ]);
  const attentes = [];
  const out = capture();
  const essai = await attendreFicheEnLigne("ma-fiche", { fetchFn, code: CODE, attendre: async (ms) => attentes.push(ms), log: out.log });
  assert.equal(essai, 4);
  assert.deepEqual(attentes, [20e3, 20e3, 20e3]);
  assert.equal(appels[0].url, "https://perlimpinpin.ai/relectures/");
  assert.equal(appels[0].opts.headers["x-relecture-admin-code"], CODE);
  assert.match(out.texte(), /pas encore en ligne/);
  assert.match(out.texte(), /HTTP 503/);
  assert.match(out.texte(), /ECONNRESET/);
  assert.ok(!out.texte().includes(CODE), "le code ne doit jamais être affiché");
});

test("attendreFicheEnLigne : abandon après 6 min (19 essais), message clair", async () => {
  const { fetchFn, appels } = fausseFetch([{ status: 200, html: "rien" }]);
  let attentes = 0;
  await assert.rejects(
    attendreFicheEnLigne("ma-fiche", { fetchFn, code: CODE, attendre: async () => attentes++, log: () => {} }),
    (e) => e instanceof RelectureError && /toujours pas en ligne après 6 min/.test(e.message),
  );
  assert.equal(appels.length, 19);
  assert.equal(attentes, 18);
});

test("attendreFicheEnLigne : code comité refusé = arrêt immédiat", async () => {
  const { fetchFn, appels } = fausseFetch([{ status: 200, redirige: "https://perlimpinpin.ai/relectures/connexion" }]);
  await assert.rejects(
    attendreFicheEnLigne("ma-fiche", { fetchFn, code: CODE, attendre: async () => assert.fail("pas d'attente"), log: () => {} }),
    /code comité .* non reconnu/,
  );
  assert.equal(appels.length, 1);
});

// ---------- resumeMarkdown ----------

test("resumeMarkdown : fiches, heure de fin et mail prêt à copier", () => {
  const echeance = instantParis(2026, 10, 7, 20, 0);
  const fiche = { relecture: { titre: "Retraites à 65 ans", candidat: "Zemmour" } };
  const mail = redigerMail({ fiche, echeance });
  const md = resumeMarkdown({ slugs: ["zemmour-retraites"], resultats: [{ slug: "zemmour-retraites", echeance, mail }] });
  assert.match(md, /^## Fiches en ligne/);
  assert.match(md, /- `zemmour-retraites`/);
  assert.match(md, /Fin du chrono : \*\*7 oct\. 2026 à 20:00\*\*/);
  assert.ok(md.includes(`Objet : ${mail.objet}`));
  assert.ok(md.includes(mail.texte));
});

test("resumeMarkdown : simulation et envoi sans chrono", () => {
  assert.match(resumeMarkdown({ slugs: ["a"], simulation: true }), /^## Simulation : rien n'a été envoyé/);
  const md = resumeMarkdown({ slugs: ["a", "b"] });
  assert.match(md, /^## Fiches envoyées/);
  assert.doesNotMatch(md, /Mail aux adhérents/);
});
