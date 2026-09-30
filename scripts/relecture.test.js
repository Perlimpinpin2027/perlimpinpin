import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  CLES, CLES_OBJECTIF, CLES_NOTATION, CLES_RELECTURE, CLES_RELECTURE_FACULTATIVES, DATA_DIR, RelectureError,
  ajouter, ficheEnLigne, fichesExistantes, lancer, parseDuree, redigerMail, slugDepuisChemin, verifierFiche,
  estNuit, finVersDuree, partiesParis, proposerFinJournee,
} from "./relecture.js";

// Outil scripts/relecture.js (aucun accès réseau : fetch simulé, dossiers temporaires).

const CODE = "code-comite-secret-123";
// Une fiche qu'on ajoute n'est jamais déjà archivée : on retire le bloc archive du modèle.
const fixture = () => {
  const fiche = JSON.parse(readFileSync(path.join(DATA_DIR, "zemmour-retraites.json"), "utf8"));
  delete fiche.relecture.archive;
  return fiche;
};

function tmp() {
  return mkdtempSync(path.join(tmpdir(), "relecture-test-"));
}

function capture() {
  const lignes = [];
  return { log: (s) => lignes.push(String(s)), texte: () => lignes.join("\n") };
}

// ---------- format des fiches ----------

test("les clés attendues sont exactement celles des fiches de data/relectures/", () => {
  const fichiers = fichesExistantes();
  assert.ok(fichiers.length > 0);
  for (const f of fichiers) {
    const fiche = JSON.parse(readFileSync(path.join(DATA_DIR, f), "utf8"));
    assert.deepEqual(Object.keys(fiche), CLES, f);
    assert.deepEqual(Object.keys(fiche.mesure_vers_objectif), CLES_OBJECTIF, f);
    assert.deepEqual(Object.keys(fiche.notation_detaillee), CLES_NOTATION, f);
    const cles = Object.keys(fiche.relecture).filter((k) => !CLES_RELECTURE_FACULTATIVES.includes(k));
    assert.deepEqual(cles, CLES_RELECTURE, f);
    assert.deepEqual(verifierFiche(fiche), [], f);
  }
});

test("verifierFiche : bloc archive accepté mais pas exigé", () => {
  const fiche = fixture();
  assert.deepEqual(verifierFiche(fiche), []);
  fiche.relecture.archive = { date: "2026-09-29", reponses: [] };
  assert.deepEqual(verifierFiche(fiche), []);
});

test("verifierFiche : clé manquante, clé en trop, bloc relecture absent", () => {
  const a = fixture();
  delete a.verdict_final;
  a.bonus = 1;
  const erreurs = verifierFiche(a).join("\n");
  assert.match(erreurs, /manquantes : verdict_final/);
  assert.match(erreurs, /inattendues : bonus/);

  const b = fixture();
  delete b.relecture;
  assert.match(verifierFiche(b).join("\n"), /manquantes : relecture/);

  const c = fixture();
  delete c.relecture.questions;
  assert.match(verifierFiche(c).join("\n"), /relecture\.questions/);
});

test("verifierFiche : score incohérent refusé (checkNotationCoherence)", () => {
  const f = fixture();
  f.notation_detaillee.score_total += 1;
  assert.match(verifierFiche(f).join("\n"), /score : score_total incohérent/);
});

test("verifierFiche : date, version et titre contrôlés", () => {
  const f = fixture();
  f.relecture.date = "28/09/2026";
  f.relecture.version = "2";
  f.relecture.titre = " ";
  const erreurs = verifierFiche(f).join("\n");
  assert.match(erreurs, /relecture\.date/);
  assert.match(erreurs, /relecture\.version/);
  assert.match(erreurs, /relecture\.titre/);
  assert.ok(verifierFiche(null).length > 0);
});

test("slugDepuisChemin : nom de fichier = slug, format contrôlé", () => {
  assert.equal(slugDepuisChemin("tmp/lisnard-cee-2.json"), "lisnard-cee-2");
  assert.equal(slugDepuisChemin("C:\\fiches\\zemmour-retraites.json"), "zemmour-retraites");
  for (const bad of ["Zemmour.json", "zemmour_retraites.json", "fiche v2.json", ".json", "a".repeat(121) + ".json"]) {
    assert.throws(() => slugDepuisChemin(bad), RelectureError, bad);
  }
  assert.equal(slugDepuisChemin("a".repeat(120) + ".json"), "a".repeat(120));
});

// ---------- ajouter ----------

test("ajouter : copie la fiche puis lance la génération", () => {
  const dir = tmp();
  const src = path.join(tmp(), "nouvelle-fiche.json");
  writeFileSync(src, JSON.stringify(fixture(), null, 2));
  let builds = 0;
  const out = capture();
  const slug = ajouter(src, { dataDir: dir, build: () => builds++, log: out.log });
  assert.equal(slug, "nouvelle-fiche");
  assert.equal(builds, 1);
  assert.deepEqual(JSON.parse(readFileSync(path.join(dir, "nouvelle-fiche.json"), "utf8")), fixture());
  assert.match(out.texte(), /Vérifie localhost:3000\/relectures, puis commite et push\./);
  rmSync(dir, { recursive: true });
});

test("ajouter : refuse un slug existant, un JSON invalide ou une fiche non conforme, sans rien écrire", () => {
  const dir = tmp();
  const srcDir = tmp();
  const build = () => assert.fail("la génération ne doit pas être lancée");

  writeFileSync(path.join(dir, "deja-la.json"), "{}");
  writeFileSync(path.join(srcDir, "deja-la.json"), JSON.stringify(fixture()));
  assert.throws(() => ajouter(path.join(srcDir, "deja-la.json"), { dataDir: dir, build }), /existe déjà/);

  writeFileSync(path.join(srcDir, "casse.json"), "{ pas du json");
  assert.throws(() => ajouter(path.join(srcDir, "casse.json"), { dataDir: dir, build }), /JSON invalide/);

  const f = fixture();
  delete f.relecture;
  writeFileSync(path.join(srcDir, "sans-relecture.json"), JSON.stringify(f));
  assert.throws(() => ajouter(path.join(srcDir, "sans-relecture.json"), { dataDir: dir, build }), /Fiche refusée/);

  assert.throws(() => ajouter(path.join(srcDir, "absente.json"), { dataDir: dir, build }), /introuvable/);
  assert.equal(existsSync(path.join(dir, "casse.json")), false);
  assert.equal(existsSync(path.join(dir, "sans-relecture.json")), false);
  rmSync(dir, { recursive: true });
  rmSync(srcDir, { recursive: true });
});

test("ajouter : fiche retirée si la génération échoue", () => {
  const dir = tmp();
  const src = path.join(tmp(), "echec-build.json");
  writeFileSync(src, JSON.stringify(fixture()));
  assert.throws(
    () => ajouter(src, { dataDir: dir, build: () => { throw new Error("boom"); }, log: () => {} }),
    /génération de la page a échoué/,
  );
  assert.equal(existsSync(path.join(dir, "echec-build.json")), false);
  rmSync(dir, { recursive: true });
});

// ---------- lancer ----------

test("parseDuree : 10h par défaut, minutes, jours, bornes de l'API", () => {
  assert.deepEqual(parseDuree(), { duration: 10, unit: "h", ms: 36e6 });
  assert.deepEqual(parseDuree("90min"), { duration: 90, unit: "min", ms: 5.4e6 });
  assert.deepEqual(parseDuree("2j"), { duration: 48, unit: "h", ms: 48 * 3600e3 });
  assert.equal(parseDuree("1,5h").duration, 1.5);
  assert.equal(parseDuree("12").unit, "h");
  for (const bad of ["abc", "0h", "30s", "31j", "-2h", ""]) assert.throws(() => parseDuree(bad), RelectureError, bad);
});

test("ficheEnLigne : cherche l'attribut data-fiche exact", () => {
  const html = '<article class="fcard" data-fiche="zemmour-retraites">';
  assert.equal(ficheEnLigne(html, "zemmour-retraites"), true);
  assert.equal(ficheEnLigne(html, "zemmour"), false);
  assert.equal(ficheEnLigne("<p>zemmour-retraites</p>", "zemmour-retraites"), false);
});

test("redigerMail : titre, candidat, lien, clôture à l'heure de Paris, rappel méthode", () => {
  const { objet, texte } = redigerMail({ fiche: fixture(), echeance: "2026-09-28T20:00:00.000Z" });
  assert.match(objet, /Sortir de la répartition sans dire qui paie/);
  assert.match(objet, /Éric Zemmour/);
  assert.match(texte, /https:\/\/perlimpinpin\.ai\/relectures/);
  assert.match(texte, /28 sept\. 2026 à 22:00 \(heure de Paris\)/);
  assert.match(texte, /sources et la méthode/);
  assert.match(texte, /pas l'opinion/);
});

function fetchSimule(reponses) {
  const appels = [];
  const fn = async (url, opts = {}) => {
    appels.push({ url, opts });
    const r = reponses[opts.method ?? "GET"];
    return {
      ok: r.status >= 200 && r.status < 300,
      status: r.status,
      redirected: r.redirected ?? false,
      url: r.url ?? url,
      text: async () => r.body,
      json: async () => r.body,
    };
  };
  return { fn, appels };
}

test("lancer --dry-run : aucune requête, code masqué, mail affiché", async () => {
  const out = capture();
  const fetchFn = () => assert.fail("aucune requête en dry-run");
  const res = await lancer("zemmour-retraites", "2h", {
    dryRun: true, fetchFn, code: CODE, log: out.log, now: () => new Date("2026-09-28T10:00:00Z"),
  });
  assert.deepEqual(res.corps, { ficheSlug: "zemmour-retraites", action: "start", duration: 2, unit: "h" });
  assert.equal(res.echeance.toISOString(), "2026-09-28T12:00:00.000Z");
  assert.match(out.texte(), /\[dry-run\]/);
  assert.match(out.texte(), /Objet : Relecture/);
  assert.doesNotMatch(out.texte(), new RegExp(CODE));
});

test("lancer : refuse si la fiche n'est pas encore en ligne (aucun POST)", async () => {
  const { fn, appels } = fetchSimule({ GET: { status: 200, body: '<article data-fiche="autre-fiche">' } });
  await assert.rejects(lancer("zemmour-retraites", "10h", { fetchFn: fn, code: CODE, log: () => {} }), /pas encore déployée/);
  assert.equal(appels.length, 1);
  assert.equal(appels[0].url, "https://perlimpinpin.ai/relectures/");
  // Page réservée aux adhérents : le code comité en ouvre la lecture seule.
  assert.equal(appels[0].opts.headers["x-relecture-admin-code"], CODE);
});

test("lancer : code comité refusé à la lecture de la page (renvoi vers la connexion) → erreur claire, aucun POST", async () => {
  const { fn, appels } = fetchSimule({
    GET: { status: 200, body: "<h1>Club Perlimpinpin</h1>", redirected: true, url: "https://perlimpinpin.ai/relectures/connexion" },
  });
  await assert.rejects(
    lancer("zemmour-retraites", "10h", { fetchFn: fn, code: CODE, log: () => {} }),
    (e) => /code comité \(RELECTURE_ADMIN_CODE\) non reconnu/.test(e.message) && !e.message.includes(CODE),
  );
  assert.equal(appels.length, 1);
});

test("lancer : POST start avec le code en en-tête, jamais affiché", async () => {
  const deadline = "2026-09-28T20:00:00.000Z";
  const { fn, appels } = fetchSimule({
    GET: { status: 200, body: '<article data-fiche="zemmour-retraites">' },
    POST: { status: 201, body: { fiche: { ficheSlug: "zemmour-retraites", reviewDeadline: deadline } } },
  });
  const out = capture();
  const res = await lancer("zemmour-retraites", undefined, { fetchFn: fn, code: CODE, log: out.log });
  const post = appels[1];
  assert.equal(post.url, "https://perlimpinpin.ai/api/relectures/chrono");
  assert.equal(post.opts.headers["x-relecture-admin-code"], CODE);
  assert.deepEqual(JSON.parse(post.opts.body), { ficheSlug: "zemmour-retraites", action: "start", duration: 10, unit: "h" });
  assert.equal(res.echeance.toISOString(), deadline);
  assert.match(out.texte(), /Chrono lancé/);
  assert.match(out.texte(), /28 sept\. 2026 à 22:00/);
  assert.doesNotMatch(out.texte(), new RegExp(CODE));
});

test("lancer : erreurs de l'API remontées (401, chrono déjà lancé), code non affiché", async () => {
  const page = { status: 200, body: '<article data-fiche="zemmour-retraites">' };
  const r401 = fetchSimule({ GET: page, POST: { status: 401, body: { error: "Code admin absent ou invalide." } } });
  await assert.rejects(lancer("zemmour-retraites", "10h", { fetchFn: r401.fn, code: CODE, log: () => {} }), /Code comité refusé/);

  const r409 = fetchSimule({ GET: page, POST: { status: 409, body: { error: "Chrono déjà lancé : prolonge-le ou arrête-le d'abord." } } });
  await assert.rejects(
    lancer("zemmour-retraites", "10h", { fetchFn: r409.fn, code: CODE, log: () => {} }),
    (e) => /HTTP 409/.test(e.message) && /déjà lancé/.test(e.message) && !e.message.includes(CODE),
  );
});

test("lancer : slug invalide, fiche inconnue ou code absent refusés avant tout envoi", async () => {
  const fetchFn = () => assert.fail("aucune requête attendue");
  await assert.rejects(lancer("Zemmour", "10h", { fetchFn, code: CODE }), /Usage/);
  await assert.rejects(lancer("fiche-inexistante", "10h", { fetchFn, code: CODE }), /Fiche inconnue/);
  await assert.rejects(lancer("zemmour-retraites", "10h", { fetchFn, code: "" }), /RELECTURE_ADMIN_CODE/);
  await assert.rejects(lancer("zemmour-retraites", "10h", { fetchFn, code: "court" }), /RELECTURE_ADMIN_CODE/);
});

// ---------- heure de fin (--fin) et clôture de nuit ----------

// 28 sept. 2026 : heure d'été à Paris (UTC+2). 25 oct. 2026 : passage à l'heure d'hiver (UTC+1).
const midiParis = new Date("2026-09-28T10:00:00Z"); // 12:00 à Paris

test("finVersDuree : heure de Paris aujourd'hui si elle est à venir, sinon demain", () => {
  assert.deepEqual(finVersDuree("20:00", midiParis), { duration: 480, unit: "min", ms: 480 * 60e3 });
  assert.equal(finVersDuree("9:00", midiParis).duration, 21 * 60); // demain 09:00
  assert.equal(finVersDuree("12:00", midiParis).duration, 24 * 60); // l'heure actuelle : demain
  assert.equal(finVersDuree("12:02", midiParis).duration, 2);
});

test("finVersDuree : gère le passage à l'heure d'hiver", () => {
  const samediSoir = new Date("2026-10-24T21:00:00Z"); // 23:00 à Paris (UTC+2)
  // Dimanche 25 oct. 09:00 à Paris = 08:00 UTC (UTC+1) : 11 h plus tard, pas 10.
  assert.equal(finVersDuree("09:00", samediSoir).duration, 11 * 60);
});

test("finVersDuree : format HH:MM obligatoire", () => {
  for (const bad of ["25:00", "20:60", "8h", "20h00", "", undefined, "2000"]) {
    assert.throws(() => finVersDuree(bad, midiParis), RelectureError, String(bad));
  }
});

test("estNuit : entre 22h et 8h, heure de Paris", () => {
  const paris = (hhmm) => new Date(`2026-09-28T${hhmm}:00+02:00`);
  assert.equal(estNuit(paris("21:59")), false);
  assert.equal(estNuit(paris("22:00")), true);
  assert.equal(estNuit(paris("03:00")), true);
  assert.equal(estNuit(paris("07:59")), true);
  assert.equal(estNuit(paris("08:00")), false);
  assert.equal(estNuit(new Date("2026-12-01T21:30:00Z")), true); // 22:30 à Paris en hiver
});

test("proposerFinJournee : 20:00 le soir même, 09:00 le matin, sinon 09:00 le lendemain", () => {
  const p = (d) => partiesParis(d);
  // Clôture à 23:00 : on propose 20:00 le même soir.
  let r = proposerFinJournee(new Date("2026-09-28T21:00:00Z"), midiParis);
  assert.deepEqual([p(r.cible).d, p(r.cible).h], [28, 20]);
  assert.equal(r.option, "--fin 20:00");
  // Clôture à 00:28 le lendemain : on propose 09:00 ce matin-là.
  r = proposerFinJournee(new Date("2026-09-28T22:28:00Z"), new Date("2026-09-28T12:28:00Z"));
  assert.deepEqual([p(r.cible).d, p(r.cible).h], [29, 9]);
  assert.equal(r.option, "--fin 09:00");
  // Lancée à 21:00 pour 2 h : 20:00 est déjà passé, on propose 09:00 le lendemain.
  r = proposerFinJournee(new Date("2026-09-28T21:00:00Z"), new Date("2026-09-28T19:00:00Z"));
  assert.deepEqual([p(r.cible).d, p(r.cible).h], [29, 9]);
  assert.equal(r.option, "--fin 09:00");
  // Clôture dans 3 jours : hors de portée de --fin, on propose une durée.
  r = proposerFinJournee(new Date("2026-10-01T21:00:00Z"), midiParis);
  assert.deepEqual([p(r.cible).d, p(r.cible).h], [1, 20]);
  assert.equal(r.option, "80h");
});

test("lancer --fin : durée en minutes envoyée à l'API, incompatible avec une durée", async () => {
  const out = capture();
  const res = await lancer("zemmour-retraites", undefined, {
    dryRun: true, fin: "20:00", code: CODE, log: out.log, now: () => midiParis, fetchFn: () => assert.fail("aucune requête"),
  });
  assert.deepEqual(res.corps, { ficheSlug: "zemmour-retraites", action: "start", duration: 480, unit: "min" });
  assert.equal(res.echeance.toISOString(), "2026-09-28T18:00:00.000Z");
  assert.doesNotMatch(out.texte(), /⚠/);
  await assert.rejects(
    lancer("zemmour-retraites", "10h", { dryRun: true, fin: "20:00", code: CODE, log: () => {}, now: () => midiParis }),
    /soit une durée, soit --fin/,
  );
});

test("lancer : avertissement et proposition si la clôture tombe la nuit", async () => {
  const out = capture();
  // Lancée à 14:28 pour 10 h : clôture à 00:28.
  await lancer("zemmour-retraites", "10h", {
    dryRun: true, code: CODE, log: out.log, now: () => new Date("2026-09-28T12:28:00Z"), fetchFn: () => assert.fail("aucune requête"),
  });
  assert.match(out.texte(), /⚠ La clôture tomberait la nuit \(29 sept\. 2026 à 00:28/);
  assert.match(out.texte(), /lancer zemmour-retraites --fin 09:00 --dry-run/);
});

test("lancer : avertissement affiché avant l'envoi en mode réel", async () => {
  const ordre = [];
  const { fn } = fetchSimule({
    GET: { status: 200, body: '<article data-fiche="zemmour-retraites">' },
    POST: { status: 201, body: { fiche: { reviewDeadline: "2026-09-28T22:28:00.000Z" } } },
  });
  const fetchFn = async (url, opts) => { ordre.push(opts?.method ?? "GET"); return fn(url, opts); };
  await lancer("zemmour-retraites", "10h", {
    code: CODE, fetchFn, now: () => new Date("2026-09-28T12:28:00Z"),
    log: (s) => { if (String(s).startsWith("⚠")) ordre.push("avertissement"); },
  });
  assert.deepEqual(ordre, ["avertissement", "GET", "POST"]);
});
