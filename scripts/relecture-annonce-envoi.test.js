import test from "node:test";
import assert from "node:assert/strict";
import { ADHERENTS_ELIGIBLES, PAUSE_MS, REPONDRE_A, traiterEnvoi } from "../src/lib/relecture-annonce-envoi.js";
import { EXPEDITEUR } from "../src/lib/mail-bienvenue.js";

// POST /api/relectures/annonce/envoyer : base, transport nodemailer et pause
// simulés. Aucun vrai mail n'est envoyé.

const CODE = "code-comite-de-test-123";
process.env.RELECTURE_ADMIN_CODE = CODE;

const ENV = {
  CLUB_SMTP_HOST: "smtp.exemple.test",
  CLUB_SMTP_PORT: "587",
  CLUB_SMTP_USER: "club@exemple.test",
  CLUB_SMTP_PASSWORD: "mot-de-passe-factice",
  ANNONCE_TEST_EMAIL: "comite@exemple.test",
};

const DEMAIN = new Date(Date.now() + 24 * 3600 * 1000);
const FICHE = { relecture: { candidat: "Édouard Philippe", parti: "Horizons", titre: "Peines planchers" } };

const ADHERENTS = [
  { id: 1, email: "camille@exemple.test", nom: "Camille D.", desinscritMailsRelectureAt: null },
  { id: 2, email: "parti@exemple.test", nom: "Léa P.", desinscritMailsRelectureAt: new Date("2026-10-10") },
  { id: 3, email: "sans-prenom@exemple.test", nom: "", desinscritMailsRelectureAt: null },
];

// Prisma simulé : applique le filtre `where` sur la désinscription comme la vraie base.
function fauxPrisma({ adherents = ADHERENTS, chronos = [{ ficheSlug: "philippe", reviewDeadline: DEMAIN }] } = {}) {
  const appels = [];
  return {
    appels,
    relectureFiche: { findMany: async () => chronos },
    adherent: {
      findMany: async (args) => {
        appels.push(args);
        return adherents.filter((a) =>
          Object.entries(args.where ?? {}).every(([cle, val]) => (val === null ? a[cle] == null : a[cle] === val)),
        );
      },
    },
  };
}

function fauxTransport({ echouePour = [] } = {}) {
  const envois = [];
  return {
    envois,
    config: null,
    creer(config) {
      this.config = config;
      return {
        sendMail: async (message) => {
          envois.push(message);
          if (echouePour.includes(message.to)) throw Object.assign(new Error("refus"), { code: "EENVELOPE", responseCode: 550 });
        },
      };
    },
  };
}

function requete(body, code = CODE) {
  return new Request("http://localhost/api/relectures/annonce/envoyer", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(code ? { "x-relecture-admin-code": code } : {}) },
    body: JSON.stringify(body),
  });
}

async function envoyer(body, { code, prisma = fauxPrisma(), transport = fauxTransport(), env = ENV } = {}) {
  const pauses = [];
  const journal = [];
  const res = await traiterEnvoi({
    request: requete(body, code),
    prisma,
    lireFiche: () => FICHE,
    env,
    creerTransport: (c) => transport.creer(c),
    attendre: async (ms) => { pauses.push(ms); },
    log: { log: (m) => journal.push(m), error: (m) => journal.push(m) },
  });
  return { ...res, prisma, transport, pauses, journal };
}

test("refus sans code comité (401), rien n'est envoyé", async () => {
  for (const code of ["", "mauvais-code-de-test"]) {
    const r = await envoyer({ mode: "reel", confirmation: "oui" }, { code });
    assert.equal(r.status, 401);
    assert.equal(r.transport.envois.length, 0);
    assert.equal(r.prisma.appels.length, 0);
  }
});

test("envoi réel refusé sans « oui » exact (400)", async () => {
  for (const confirmation of [undefined, "", "Oui", "oui ", "non"]) {
    const r = await envoyer({ mode: "reel", confirmation });
    assert.equal(r.status, 400);
    assert.equal(r.transport.envois.length, 0);
  }
  assert.equal((await envoyer({ mode: "autre" })).status, 400);
});

test("envoi réel : désinscrits exclus, un mail par destinataire, seul dans « À »", async () => {
  const r = await envoyer({ mode: "reel", confirmation: "oui" });
  assert.equal(r.status, 200);
  assert.deepEqual(r.body, { envoyes: 2, echecs: [], restants: 0 });
  assert.deepEqual(r.prisma.appels[0].where, ADHERENTS_ELIGIBLES);
  assert.deepEqual(r.transport.envois.map((m) => m.to), ["camille@exemple.test", "sans-prenom@exemple.test"]);
  for (const m of r.transport.envois) {
    assert.equal(typeof m.to, "string");
    assert.equal(m.cc, undefined);
    assert.equal(m.bcc, undefined);
    assert.equal(m.from, EXPEDITEUR);
    assert.equal(m.replyTo, REPONDRE_A);
    assert.equal(m.subject, "Une nouvelle fiche à relire avant publication");
    assert.ok(m.html.includes("<a href=\"https://perlimpinpin.ai/relectures\""));
    assert.ok(m.text.includes("• Édouard Philippe (Horizons) : Peines planchers"));
  }
  assert.ok(r.transport.envois[0].text.startsWith("Bonjour Camille,"));
  assert.ok(r.transport.envois[1].text.startsWith("Bonjour,"));
  assert.deepEqual(r.pauses, [PAUSE_MS]);
  assert.equal(r.transport.config.secure, false); // 587 : STARTTLS
});

test("un échec n'arrête pas les envois suivants", async () => {
  const transport = fauxTransport({ echouePour: ["camille@exemple.test"] });
  const r = await envoyer({ mode: "reel", confirmation: "oui" }, { transport });
  assert.deepEqual(r.body, { envoyes: 1, echecs: ["camille@exemple.test"], restants: 0 });
  assert.equal(transport.envois.length, 2);
  // Journal : ni adresse ni réglage SMTP.
  const journal = r.journal.join("\n");
  assert.ok(!journal.includes("@"));
  assert.ok(!journal.includes(ENV.CLUB_SMTP_PASSWORD));
});

test("mode test : un seul mail, à ANNONCE_TEST_EMAIL, prénom d'exemple", async () => {
  const r = await envoyer({ mode: "test" });
  assert.deepEqual(r.body, { envoyes: 1, echecs: [], restants: 0 });
  assert.equal(r.prisma.appels.length, 0);
  assert.equal(r.transport.envois.length, 1);
  assert.equal(r.transport.envois[0].to, ENV.ANNONCE_TEST_EMAIL);
  assert.ok(r.transport.envois[0].text.startsWith("Bonjour Camille,"));
});

test("configuration SMTP incomplète : message neutre, rien n'est envoyé", async () => {
  const r = await envoyer({ mode: "test" }, { env: { ...ENV, CLUB_SMTP_PASSWORD: "" } });
  assert.equal(r.status, 500);
  assert.deepEqual(r.body, { error: "Configuration SMTP incomplète." });
  assert.equal(r.transport.envois.length, 0);
});

test("aucune fiche avec chrono en cours : 409", async () => {
  const r = await envoyer({ mode: "reel", confirmation: "oui" }, { prisma: fauxPrisma({ chronos: [] }) });
  assert.equal(r.status, 409);
  assert.equal(r.transport.envois.length, 0);
});
