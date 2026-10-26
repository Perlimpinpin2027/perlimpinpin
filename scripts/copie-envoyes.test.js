import test from "node:test";
import assert from "node:assert/strict";
import { avecMention, configImapClub, deposerDansEnvoyes, mentionEnvoi, PORT_IMAP } from "../src/lib/copie-envoyes.js";

// Copie des mails envoyés dans le dossier Envoyés du Club : serveur IMAP
// simulé, aucune connexion réseau.

const ENV = {
  CLUB_SMTP_HOST: "smtp.exemple.test",
  CLUB_SMTP_PORT: "587",
  CLUB_SMTP_USER: "club@exemple.test",
  CLUB_SMTP_PASSWORD: "mot-de-passe-factice",
};

const MESSAGE = {
  from: '"Club" <club@exemple.test>',
  to: "camille@exemple.test",
  subject: "Sujet de test",
  text: "Bonjour Camille,\n\nCorps.",
  html: '<!doctype html><html><body style="margin:0"><p>Bonjour Camille,</p></body></html>',
};

// Boîte simulée : « Sent » n'a pas l'attribut \Sent, c'est « Éléments envoyés » qui l'a.
const DOSSIERS = [
  { path: "INBOX", flags: new Set() },
  { path: "Sent", flags: new Set() },
  { path: "Éléments envoyés", flags: new Set(["\\Sent"]) },
];

function fauxImap({ dossiers = DOSSIERS, echoue = null, bloque = false } = {}) {
  const etat = { config: null, depots: [], deconnecte: false, ferme: false };
  etat.creer = (config) => {
    etat.config = config;
    return {
      connect: async () => {
        if (bloque) return new Promise(() => {});
        if (echoue === "connect") throw Object.assign(new Error(`échec pour ${config.auth.user} / ${config.auth.pass}`), { code: "ECONNREFUSED" });
      },
      list: async () => dossiers,
      append: async (path, contenu, flags, date) => {
        if (echoue === "append") throw Object.assign(new Error("refus"), { code: "NoConnection" });
        etat.depots.push({ path, contenu: contenu.toString(), flags, date });
      },
      logout: async () => { etat.deconnecte = true; },
      close: () => { etat.ferme = true; },
    };
  };
  return etat;
}

function journal() {
  const lignes = [];
  return { lignes, log: { log: (m) => lignes.push(m), warn: (m) => lignes.push(m), error: (m) => lignes.push(m) } };
}

test("configuration IMAP : identifiants SMTP, port 993 en TLS, serveur IMAP ou SMTP", () => {
  const c = configImapClub(ENV);
  assert.equal(c.host, "smtp.exemple.test");
  assert.equal(c.port, PORT_IMAP);
  assert.equal(c.port, 993);
  assert.equal(c.secure, true);
  assert.deepEqual(c.auth, { user: "club@exemple.test", pass: "mot-de-passe-factice" });
  assert.equal(c.logger, false);
  assert.equal(configImapClub({ ...ENV, CLUB_IMAP_HOST: " imap.exemple.test " }).host, "imap.exemple.test");
  assert.equal(configImapClub({ ...ENV, CLUB_SMTP_PASSWORD: "" }), null);
  assert.equal(configImapClub({ ...ENV, CLUB_SMTP_USER: "" }), null);
  assert.equal(configImapClub({ CLUB_SMTP_USER: "u", CLUB_SMTP_PASSWORD: "p" }), null);
});

test("mention : nombre d'adhérents et adresses, au singulier comme au pluriel", () => {
  assert.equal(mentionEnvoi(["a@x.fr"]), "Envoyé à 1 adhérent : a@x.fr");
  assert.equal(mentionEnvoi(["a@x.fr", "b@x.fr"]), "Envoyé à 2 adhérents : a@x.fr, b@x.fr");
  const m = avecMention(MESSAGE, ["a@x.fr", "<b>@x.fr"]);
  assert.ok(m.text.startsWith("Envoyé à 2 adhérents : a@x.fr, <b>@x.fr\n\nBonjour Camille,"));
  // Juste après <body>, et échappée dans le HTML.
  assert.match(m.html, /<body style="margin:0">\n<p [^>]*>Envoyé à 2 adhérents : a@x.fr, &lt;b&gt;@x.fr<\/p><p>Bonjour/);
  assert.equal(m.subject, MESSAGE.subject);
  assert.equal(MESSAGE.text.startsWith("Bonjour"), true); // l'original n'est pas modifié
});

test("dépôt : dossier trouvé par l'attribut \\Sent, pas par son nom ; marqué lu", async () => {
  const imap = fauxImap();
  const { lignes, log } = journal();
  const ok = await deposerDansEnvoyes(avecMention(MESSAGE, ["camille@exemple.test"]), { env: ENV, creerClient: imap.creer, log });
  assert.equal(ok, true);
  assert.equal(imap.depots.length, 1);
  assert.equal(imap.depots[0].path, "Éléments envoyés");
  assert.deepEqual(imap.depots[0].flags, ["\\Seen"]);
  assert.ok(imap.depots[0].date instanceof Date);
  // Message MIME complet, avec la mention.
  const brut = imap.depots[0].contenu;
  assert.match(brut, /^From: /m);
  assert.match(brut, /^To: camille@exemple\.test/m);
  assert.match(brut, /^Subject: Sujet de test/m);
  assert.ok(brut.includes("adh=C3=A9rent : camille@exemple.test") || brut.includes("adhérent : camille@exemple.test"));
  assert.equal(imap.deconnecte, true);
  assert.deepEqual(lignes, []);
});

test("pas de dossier \\Sent : copie abandonnée, rien n'est déposé dans « Sent »", async () => {
  const imap = fauxImap({ dossiers: DOSSIERS.slice(0, 2) });
  const { lignes, log } = journal();
  assert.equal(await deposerDansEnvoyes(MESSAGE, { env: ENV, creerClient: imap.creer, log }), false);
  assert.equal(imap.depots.length, 0);
  assert.equal(imap.ferme, true);
  assert.deepEqual(lignes, ["[club] copie Envoyés impossible (SANS_DOSSIER_SENT)"]);
});

test("échec IMAP : false, jamais d'exception, ni identifiant ni mot de passe au journal", async () => {
  for (const echoue of ["connect", "append"]) {
    const imap = fauxImap({ echoue });
    const { lignes, log } = journal();
    const ok = await deposerDansEnvoyes(MESSAGE, { env: ENV, creerClient: imap.creer, log, prefixe: "[annonce]" });
    assert.equal(ok, false);
    assert.equal(lignes.length, 1);
    assert.match(lignes[0], /^\[annonce\] copie Envoyés impossible/);
    const tout = lignes.join("\n");
    assert.ok(!tout.includes("@"));
    assert.ok(!tout.includes(ENV.CLUB_SMTP_PASSWORD));
  }
});

test("serveur muet : abandon au bout du délai, connexion fermée", async () => {
  const imap = fauxImap({ bloque: true });
  const { lignes, log } = journal();
  const ok = await deposerDansEnvoyes(MESSAGE, { env: ENV, creerClient: imap.creer, log, delaiMs: 20 });
  assert.equal(ok, false);
  assert.equal(imap.ferme, true);
  assert.deepEqual(lignes, ["[club] copie Envoyés impossible (DELAI)"]);
});

test("configuration incomplète : aucune connexion tentée", async () => {
  const imap = fauxImap();
  const { lignes, log } = journal();
  assert.equal(await deposerDansEnvoyes(MESSAGE, { env: {}, creerClient: imap.creer, log }), false);
  assert.equal(imap.config, null);
  assert.match(lignes[0], /copie Envoyés impossible/);
});
