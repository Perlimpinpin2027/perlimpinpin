import { ImapFlow } from "imapflow";
import MailComposer from "nodemailer/lib/mail-composer/index.js";

// Copie des mails envoyés par le site dans le dossier « Envoyés » de la boîte
// du Club (club@perlimpinpin.ai), en IMAP : une copie par mail de bienvenue,
// une seule copie par envoi réel d'annonce (mail-bienvenue.js,
// relecture-annonce-envoi.js). La copie commence par « Envoyé à N adhérents :
// adresse1, adresse2… ».
//
// Variables d'environnement : CLUB_SMTP_USER et CLUB_SMTP_PASSWORD (mêmes
// identifiants qu'en SMTP), CLUB_IMAP_HOST (par défaut CLUB_SMTP_HOST).
// Port 993, TLS direct. Le dossier est repéré par son attribut \Sent, renvoyé
// par le serveur, jamais par son nom.
//
// Règles : la copie ne fait jamais échouer un envoi. En cas de problème, on
// journalise « copie Envoyés impossible » avec un code d'erreur, jamais un
// identifiant, un mot de passe ou une adresse.

export const PORT_IMAP = 993;
const DELAI_CONNEXION_MS = 5_000;
const DELAI_SOCKET_MS = 8_000;
// Plafond de toute l'opération : l'annonce tourne sous maxDuration (60 s).
export const DELAI_TOTAL_MS = 8_000;

// Réglages IMAP, ou null si une variable manque.
export function configImapClub(env = process.env) {
  const host = env.CLUB_IMAP_HOST?.trim() || env.CLUB_SMTP_HOST?.trim();
  const user = env.CLUB_SMTP_USER?.trim();
  const pass = env.CLUB_SMTP_PASSWORD;
  if (!host || !user || !pass) return null;
  return {
    host,
    port: PORT_IMAP,
    secure: true,
    auth: { user, pass },
    logger: false, // imapflow journalise sinon les échanges, identifiant compris
    connectionTimeout: DELAI_CONNEXION_MS,
    greetingTimeout: DELAI_CONNEXION_MS,
    socketTimeout: DELAI_SOCKET_MS,
  };
}

const echapperHtml = (s) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export function mentionEnvoi(adresses) {
  const n = adresses.length;
  return `Envoyé à ${n} adhérent${n > 1 ? "s" : ""} : ${adresses.join(", ")}`;
}

// Message nodemailer → même message précédé de la mention, en texte et en HTML.
export function avecMention(message, adresses) {
  const mention = mentionEnvoi(adresses);
  const bloc = `<p style="margin:0 0 16px;padding:8px 12px;background:#f4f4f5;font-size:12px;color:#52525b">${echapperHtml(mention)}</p>`;
  const html = message.html
    ? /<body[^>]*>/i.test(message.html)
      ? message.html.replace(/<body[^>]*>/i, (b) => `${b}\n${bloc}`)
      : `${bloc}\n${message.html}`
    : undefined;
  return { ...message, text: `${mention}\n\n${message.text ?? ""}`, html };
}

const enMime = (message) => new MailComposer(message).compile().build();

// Dépose `message` (format nodemailer) dans le dossier \Sent. Renvoie true ou
// false, ne lève jamais d'exception. `creerClient` est remplaçable en test.
export async function deposerDansEnvoyes(
  message,
  { env = process.env, creerClient = (c) => new ImapFlow(c), log = console, prefixe = "[club]", delaiMs = DELAI_TOTAL_MS } = {},
) {
  const config = configImapClub(env);
  if (!config) {
    log.error(`${prefixe} copie Envoyés impossible : variables CLUB_SMTP_* incomplètes`);
    return false;
  }
  let client = null;
  let minuteur;
  const depot = async () => {
    const brut = await enMime(message);
    client = creerClient(config);
    await client.connect();
    const dossiers = await client.list();
    const envoyes = dossiers.find((d) => d.flags?.has("\\Sent"));
    if (!envoyes) throw Object.assign(new Error("pas de dossier \\Sent"), { code: "SANS_DOSSIER_SENT" });
    await client.append(envoyes.path, brut, ["\\Seen"], new Date());
    await client.logout();
  };
  try {
    await Promise.race([
      depot(),
      new Promise((_, refuse) => {
        minuteur = setTimeout(() => refuse(Object.assign(new Error("délai dépassé"), { code: "DELAI" })), delaiMs);
      }),
    ]);
    return true;
  } catch (e) {
    // Jamais le message de l'erreur : il peut contenir l'identifiant.
    log.error(`${prefixe} copie Envoyés impossible (${e?.code ?? "erreur"})`);
    try {
      client?.close();
    } catch {}
    return false;
  } finally {
    clearTimeout(minuteur);
  }
}
