// Envoi de mails depuis la boîte Zimbra du Club (club@perlimpinpin.ai), en SMTP.
// Utilisé par scripts/relecture.js (appels à relecture).
//
// Variables de .env : CLUB_SMTP_HOST, CLUB_SMTP_PORT (587 = STARTTLS, 465 = TLS),
// CLUB_SMTP_USER, CLUB_SMTP_PASSWORD. Le mot de passe n'est JAMAIS affiché ni
// journalisé : les erreurs remontées ne citent que le code d'erreur SMTP.

import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as attendre } from "node:timers/promises";
import nodemailer from "nodemailer";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const JOURNAL_PATH = path.join(ROOT, "logs/mails-relecture.jsonl");
export const EXPEDITEUR = '"Club Perlimpinpin" <club@perlimpinpin.ai>';
export const PAUSE_MS = 2000; // environ 1 mail toutes les 2 secondes

export class MailError extends Error {}

// Lit la configuration SMTP dans l'environnement (déjà chargé depuis .env).
export function configSmtp(env = process.env) {
  const manquantes = ["CLUB_SMTP_HOST", "CLUB_SMTP_PORT", "CLUB_SMTP_USER", "CLUB_SMTP_PASSWORD"].filter((k) => !env[k]);
  if (manquantes.length) throw new MailError(`Variables absentes de .env : ${manquantes.join(", ")}.`);
  const port = Number(env.CLUB_SMTP_PORT);
  if (port !== 587 && port !== 465) throw new MailError("CLUB_SMTP_PORT : 587 (STARTTLS) ou 465 (TLS) attendu.");
  return {
    host: env.CLUB_SMTP_HOST,
    port,
    secure: port === 465, // 465 : TLS direct ; 587 : STARTTLS exigé ci-dessous
    requireTLS: port === 587,
    auth: { user: env.CLUB_SMTP_USER, pass: env.CLUB_SMTP_PASSWORD },
  };
}

export async function creerTransport(env = process.env) {
  const transport = nodemailer.createTransport({ ...configSmtp(env), pool: false });
  try {
    await transport.verify();
  } catch (e) {
    throw new MailError(`Connexion SMTP impossible (${e.code ?? "erreur"}${e.responseCode ? ` ${e.responseCode}` : ""}).`);
  }
  return transport;
}

// Un mail = un destinataire (jamais de liste visible).
export function messageNodemailer({ a, mail, unClic }) {
  return {
    from: EXPEDITEUR,
    to: a,
    subject: mail.objet,
    text: mail.texte,
    html: mail.html,
    headers: {
      // Désinscription en un clic (Gmail, Outlook) : POST sur cette URL.
      "List-Unsubscribe": `<${unClic}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  };
}

// Envoie les messages un par un, avec une pause entre deux envois. Un échec est
// noté puis on continue. `apresEnvoi({ id, statut })` est appelé après chaque
// envoi (journal). Retourne { envoyes, echecs: [{ id, erreur }] }.
export async function envoyerUnParUn({ transport, messages, pauseMs = PAUSE_MS, apresEnvoi = () => {}, log = console.log, pause = attendre }) {
  let envoyes = 0;
  const echecs = [];
  for (let i = 0; i < messages.length; i++) {
    const { id, message } = messages[i];
    if (i > 0) await pause(pauseMs);
    try {
      await transport.sendMail(message);
      envoyes++;
      apresEnvoi({ id, statut: "ok" });
      log(`  ✓ ${i + 1}/${messages.length} adhérent n°${id}`);
    } catch (e) {
      const erreur = `${e.code ?? "erreur"}${e.responseCode ? ` ${e.responseCode}` : ""}`;
      echecs.push({ id, erreur });
      apresEnvoi({ id, statut: "echec" });
      log(`  ✗ ${i + 1}/${messages.length} adhérent n°${id} (${erreur})`);
    }
  }
  return { envoyes, echecs };
}

// ---------- journal (jamais d'adresse e-mail : RGPD) ----------

export function journaliser({ slug, adherentId, statut, chemin = JOURNAL_PATH, date = new Date() }) {
  mkdirSync(path.dirname(chemin), { recursive: true });
  appendFileSync(chemin, `${JSON.stringify({ date: date.toISOString(), slug, adherentId, statut })}\n`);
}

// Identifiants des adhérents ayant déjà reçu (statut « ok ») le mail de ce slug.
export function dejaEnvoyes(slug, chemin = JOURNAL_PATH) {
  const ids = new Set();
  if (!existsSync(chemin)) return ids;
  for (const ligne of readFileSync(chemin, "utf8").split("\n")) {
    if (!ligne.trim()) continue;
    try {
      const e = JSON.parse(ligne);
      if (e.slug === slug && e.statut === "ok") ids.add(e.adherentId);
    } catch {
      // ligne abîmée : ignorée
    }
  }
  return ids;
}
