import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { masquerEmail, prenomDepuisNom, redigerMailAdherent } from "./lib/mail-relecture.js";
import { configSmtp, dejaEnvoyes, envoyerUnParUn, journaliser, messageNodemailer } from "./lib/mail-club.js";
import { ADHERENT_FICTIF, DATA_DIR, appelRelecture } from "./relecture.js";

// Mail d'appel à relecture : contenu, prénom, désinscription, journal, envoi
// (transport simulé : aucun mail réel, aucune base).

const fixture = () => JSON.parse(readFileSync(path.join(DATA_DIR, "zemmour-retraites.json"), "utf8"));
const LIEN = "https://perlimpinpin.ai/relectures/desinscription?t=42.abc";
const ECHEANCE = "2026-09-28T20:00:00.000Z"; // 22:00 à Paris (heure d'été)
const SECRET = "secret-de-test-assez-long";

// ---------- prénom ----------

test("prenomDepuisNom : premier mot du nom affiché", () => {
  assert.equal(prenomDepuisNom("Camille D."), "Camille");
  assert.equal(prenomDepuisNom("  Jean-Pierre   Martin "), "Jean-Pierre");
  assert.equal(prenomDepuisNom("Éloïse"), "Éloïse");
  assert.equal(prenomDepuisNom("camille d."), "Camille");
  assert.equal(prenomDepuisNom("CAMILLE D."), "Camille");
  assert.equal(prenomDepuisNom("jean-pierre"), "Jean-Pierre");
  assert.equal(prenomDepuisNom("Anne-Sophie,"), "Anne-Sophie");
  assert.equal(prenomDepuisNom("McLeod"), "McLeod");
});

test("prenomDepuisNom : vide, une lettre, adresse e-mail ou bizarre -> null", () => {
  for (const nom of [undefined, null, 42, "", "   ", "C.", "C", "c. dupont", "camille@gmail.com", "camille.d@exemple.fr X", "123", "--", "...", "😀"]) {
    assert.equal(prenomDepuisNom(nom), null, String(nom));
  }
});

// ---------- contenu ----------

test("redigerMailAdherent : objet, salutation, titre, thème, résumé, lien, échéance à l'heure de Paris", () => {
  const fiche = fixture();
  const { objet, texte, html } = redigerMailAdherent({ fiche, prenom: "Camille", echeance: ECHEANCE, lienDesinscription: LIEN });
  assert.equal(objet, `Nouvelle fiche à passer au crible : ${fiche.relecture.titre} (${fiche.relecture.candidat})`.replace(/\s*—\s*/g, ", "));
  assert.match(texte, /^Bonjour Camille !\n/);
  assert.ok(texte.includes(`thème ${fiche.relecture.theme})`));
  assert.ok(texte.includes("En deux mots : "));
  assert.match(texte, /Pour relire et commenter : https:\/\/perlimpinpin\.ai\/relectures\n/);
  assert.match(texte, /Clôture des commentaires : 28 sept\. 2026 à 22:00 \(heure de Paris\)\./);
  assert.match(texte, /20 PerlimpinPOINTS/);
  assert.match(texte, /\n--\nVous recevez ce message parce que vous êtes adhérent du Club Perlimpinpin\.\n/);
  assert.ok(texte.includes(`Ne plus recevoir les appels à relecture : ${LIEN}`));
  assert.ok(html.includes(`href="${LIEN}"`));
  assert.match(html, /28 sept\. 2026 à 22:00/);
});

test("redigerMailAdherent : « Bonjour ! » sans prénom", () => {
  const { texte, html } = redigerMailAdherent({ fiche: fixture(), prenom: null, echeance: ECHEANCE, lienDesinscription: LIEN });
  assert.match(texte, /^Bonjour !\n/);
  assert.match(html, /Bonjour !/);
});

test("redigerMailAdherent : aucun tiret cadratin, même si la fiche en contient", () => {
  const fiche = fixture();
  fiche.relecture.titre = "Retraites — le grand flou";
  fiche.resume_court = "Une mesure — floue — et chère.";
  const mail = redigerMailAdherent({ fiche, prenom: "Camille", echeance: ECHEANCE, lienDesinscription: LIEN });
  for (const [k, v] of Object.entries(mail)) assert.ok(!v.includes("—"), k);
  assert.match(mail.objet, /Retraites, le grand flou/);
  // Toutes les fiches présentes (liste non figée : une fiche peut être retirée).
  const noms = readdirSync(DATA_DIR).filter((n) => n.endsWith(".json"));
  assert.ok(noms.length > 0);
  for (const nom of noms) {
    const f = JSON.parse(readFileSync(path.join(DATA_DIR, nom), "utf8"));
    const m = redigerMailAdherent({ fiche: f, prenom: null, echeance: ECHEANCE, lienDesinscription: LIEN });
    for (const v of Object.values(m)) assert.ok(!v.includes("—"), nom);
  }
});

test("redigerMailAdherent : HTML échappé", () => {
  const fiche = fixture();
  fiche.resume_court = "Coût < 5 Md€ & <script>alert(1)</script>";
  const { html } = redigerMailAdherent({ fiche, prenom: "Camille", echeance: ECHEANCE, lienDesinscription: LIEN });
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes("Coût &lt; 5 Md€ &amp; &lt;script&gt;"));
});

test("masquerEmail", () => {
  assert.equal(masquerEmail("camille@gmail.com"), "c***@gmail.com");
  assert.equal(masquerEmail("pas-une-adresse"), "***");
});

// ---------- SMTP / message ----------

test("configSmtp : variables manquantes signalées sans valeur, port 587 STARTTLS ou 465 TLS", () => {
  assert.throws(() => configSmtp({}), /CLUB_SMTP_HOST, CLUB_SMTP_PORT, CLUB_SMTP_USER, CLUB_SMTP_PASSWORD/);
  const env = { CLUB_SMTP_HOST: "smtp.exemple.fr", CLUB_SMTP_USER: "club@perlimpinpin.ai", CLUB_SMTP_PASSWORD: "mot-de-passe-secret" };
  assert.deepEqual({ ...configSmtp({ ...env, CLUB_SMTP_PORT: "587" }), auth: null }, { host: "smtp.exemple.fr", port: 587, secure: false, requireTLS: true, auth: null });
  assert.equal(configSmtp({ ...env, CLUB_SMTP_PORT: "465" }).secure, true);
  assert.throws(() => configSmtp({ ...env, CLUB_SMTP_PORT: "25" }), (e) => !e.message.includes("mot-de-passe-secret"));
});

test("messageNodemailer : un seul destinataire, expéditeur du Club, en-têtes de désinscription un clic", () => {
  const mail = { objet: "O", texte: "T", html: "<p>H</p>" };
  const m = messageNodemailer({ a: "camille@gmail.com", mail, unClic: "https://perlimpinpin.ai/api/relectures/desinscription?t=1.x" });
  assert.equal(m.from, '"Club Perlimpinpin" <club@perlimpinpin.ai>');
  assert.equal(m.to, "camille@gmail.com");
  assert.equal(m.cc, undefined);
  assert.equal(m.bcc, undefined);
  assert.equal(m.headers["List-Unsubscribe"], "<https://perlimpinpin.ai/api/relectures/desinscription?t=1.x>");
  assert.equal(m.headers["List-Unsubscribe-Post"], "List-Unsubscribe=One-Click");
});

test("envoyerUnParUn : pause entre deux envois, échec noté puis on continue", async () => {
  const pauses = [];
  const envoyes = [];
  const transport = {
    sendMail: async (m) => {
      if (m.to === "b@x.fr") throw Object.assign(new Error("refusé"), { code: "EENVELOPE", responseCode: 550 });
      envoyes.push(m.to);
    },
  };
  const journal = [];
  const res = await envoyerUnParUn({
    transport,
    messages: [{ id: 1, message: { to: "a@x.fr" } }, { id: 2, message: { to: "b@x.fr" } }, { id: 3, message: { to: "c@x.fr" } }],
    apresEnvoi: (e) => journal.push(e),
    log: () => {},
    pause: async (ms) => pauses.push(ms),
  });
  assert.deepEqual(envoyes, ["a@x.fr", "c@x.fr"]);
  assert.deepEqual(pauses, [2000, 2000]);
  assert.deepEqual(res, { envoyes: 2, echecs: [{ id: 2, erreur: "EENVELOPE 550" }] });
  assert.deepEqual(journal, [{ id: 1, statut: "ok" }, { id: 2, statut: "echec" }, { id: 3, statut: "ok" }]);
});

// ---------- journal ----------

test("journal : une ligne par envoi, sans adresse ; dejaEnvoyes ne compte que les « ok » du slug", () => {
  const chemin = path.join(mkdtempSync(path.join(tmpdir(), "mails-")), "mails-relecture.jsonl");
  assert.equal(dejaEnvoyes("s", chemin).size, 0);
  journaliser({ slug: "s", adherentId: 1, statut: "ok", chemin });
  journaliser({ slug: "s", adherentId: 2, statut: "echec", chemin });
  journaliser({ slug: "autre", adherentId: 3, statut: "ok", chemin });
  const lignes = readFileSync(chemin, "utf8").trim().split("\n").map((l) => JSON.parse(l));
  assert.deepEqual(Object.keys(lignes[0]), ["date", "slug", "adherentId", "statut"]);
  assert.ok(!readFileSync(chemin, "utf8").includes("@"));
  assert.deepEqual([...dejaEnvoyes("s", chemin)], [1]);
});

// ---------- appelRelecture (base et SMTP simulés) ----------

const ADHERENTS = [
  { id: 1, email: "camille@gmail.com", nom: "Camille D.", activatedAt: new Date() },
  { id: 2, email: "dominique@exemple.fr", nom: "D.", activatedAt: null },
  { id: 3, email: "deja@exemple.fr", nom: "Déjà Servi", activatedAt: new Date() },
];

function simulations({ reponse = "oui" } = {}) {
  const lignes = [];
  const envoyes = [];
  const journal = [];
  let baseOuverte = false;
  return {
    lignes, envoyes, journal,
    get baseOuverte() { return baseOuverte; },
    options: {
      secret: SECRET,
      log: (s) => lignes.push(String(s)),
      demander: async () => reponse === "oui",
      base: async () => {
        baseOuverte = true;
        return { host: "ep-copie.neon.tech", prisma: { adherent: { findMany: async () => ADHERENTS }, $disconnect: async () => {} } };
      },
      transport: async () => ({ sendMail: async (m) => envoyes.push(m), close: () => {} }),
      journal: (e) => journal.push(e),
      envoyes: () => new Set([3]),
      pauseMs: 0,
    },
  };
}

test("appelRelecture --dry-run : adhérent fictif, ni base ni envoi", async () => {
  const s = simulations();
  const ok = await appelRelecture({ slug: "z", fiche: fixture(), echeance: ECHEANCE, dryRun: true, ...s.options, base: () => assert.fail("base"), transport: () => assert.fail("smtp") });
  assert.equal(ok, true);
  const texte = s.lignes.join("\n");
  assert.match(texte, /Bonjour Camille !/);
  assert.match(texte, /c\*\*\*@exemple\.fr/);
  assert.ok(!texte.includes(ADHERENT_FICTIF.email));
});

test("appelRelecture : déjà servis sautés, comptes, aperçu masqué, envoi après « oui », journal", async () => {
  const s = simulations();
  const ok = await appelRelecture({ slug: "z", fiche: fixture(), echeance: ECHEANCE, ...s.options });
  assert.equal(ok, true);
  const texte = s.lignes.join("\n");
  assert.match(texte, /1 adhérent\(s\) déjà destinataire/);
  assert.match(texte, /Destinataires : 2 \(1 compte\(s\) activé\(s\), 1 non activé\(s\)\)/);
  assert.match(texte, /c\*\*\*@gmail\.com/);
  assert.ok(!texte.includes("camille@gmail.com"));
  assert.deepEqual(s.envoyes.map((m) => m.to), ["camille@gmail.com", "dominique@exemple.fr"]);
  assert.match(s.envoyes[0].text, /^Bonjour Camille !/);
  assert.match(s.envoyes[1].text, /^Bonjour !/);
  assert.ok(!s.envoyes[0].text.includes(SECRET));
  assert.match(s.envoyes[0].headers["List-Unsubscribe"], /\/api\/relectures\/desinscription\?t=1\./);
  assert.deepEqual(s.journal, [{ slug: "z", adherentId: 1, statut: "ok" }, { slug: "z", adherentId: 2, statut: "ok" }]);
  assert.match(texte, /Bilan : 2 envoyé\(s\), 0 échec\(s\)/);
});

test("appelRelecture : toute autre réponse que « oui » -> rien n'est envoyé", async () => {
  const s = simulations({ reponse: "non" });
  const ok = await appelRelecture({ slug: "z", fiche: fixture(), echeance: ECHEANCE, ...s.options });
  assert.equal(ok, false);
  assert.equal(s.envoyes.length, 0);
  assert.equal(s.journal.length, 0);
});

test("appelRelecture --test-a : un seul mail, prénom fictif, ni base ni journal", async () => {
  const s = simulations();
  const ok = await appelRelecture({ slug: "z", fiche: fixture(), echeance: ECHEANCE, testA: "moi@exemple.fr", siteLiens: "http://localhost:3000", ...s.options });
  assert.equal(ok, true);
  assert.equal(s.baseOuverte, false);
  assert.equal(s.journal.length, 0);
  assert.deepEqual(s.envoyes.map((m) => m.to), ["moi@exemple.fr"]);
  assert.match(s.envoyes[0].text, /^Bonjour Camille !/);
  assert.match(s.envoyes[0].text, /http:\/\/localhost:3000\/relectures\/desinscription\?t=999999999\./);
});

test("appelRelecture : AUTH_SECRET absent -> erreur avant toute lecture ou envoi", async () => {
  const s = simulations();
  await assert.rejects(appelRelecture({ slug: "z", fiche: fixture(), echeance: ECHEANCE, ...s.options, secret: "" }), /AUTH_SECRET/);
  assert.equal(s.baseOuverte, false);
});
