// Envoi manuel du mail de bienvenue du Club (le même que celui envoyé
// automatiquement à chaque nouvelle adhésion HelloAsso).
// Sert à faire un test, ou à renvoyer le mail à un adhérent qui ne l'a pas reçu.
//
//   node scripts/envoyer-bienvenue.js --a camille@exemple.fr --prenom Camille
//       → simulation (par défaut) : écrit l'aperçu dans tmp/mail-bienvenue.html,
//         n'envoie rien
//   node scripts/envoyer-bienvenue.js --a camille@exemple.fr --prenom Camille --envoyer
//       → envoie vraiment (après confirmation « oui »)
//
// Variables CLUB_SMTP_* lues dans .env (voir .env.example). Ni la base ni
// HelloAsso ne sont touchées.
import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { composerMailBienvenue, configSmtpClub, envoyerMailBienvenue, OBJET_BIENVENUE } from "../src/lib/mail-bienvenue.js";

const USAGE = "Usage : node scripts/envoyer-bienvenue.js --a <e-mail> [--prenom <Prénom>] [--envoyer]";
const APERCU = join(dirname(fileURLToPath(import.meta.url)), "..", "tmp", "mail-bienvenue.html");

function fail(message) {
  console.error(`Erreur : ${message}\n${USAGE}`);
  process.exit(1);
}

const { values } = parseArgs({
  options: {
    a: { type: "string" },
    prenom: { type: "string" },
    envoyer: { type: "boolean", default: false },
  },
});

const email = values.a?.trim();
if (!email || !email.includes("@")) fail("adresse e-mail manquante (--a).");
const prenom = values.prenom?.trim() || null;

const mail = composerMailBienvenue({ prenom });
mkdirSync(dirname(APERCU), { recursive: true });
writeFileSync(APERCU, mail.html);
console.log(`Objet   : ${OBJET_BIENVENUE}`);
console.log(`Début   : ${prenom ? `Bonjour ${prenom},` : "Bonjour,"}`);
console.log(`Aperçu  : ${APERCU}`);

if (!values.envoyer) {
  console.log("\nSimulation : rien n'a été envoyé. Ajouter --envoyer pour envoyer vraiment.");
  process.exit(0);
}

if (!configSmtpClub()) fail("variables CLUB_SMTP_* incomplètes dans .env.");

const rl = createInterface({ input: process.stdin, output: process.stdout });
const reponse = await rl.question(`\nEnvoyer le mail de bienvenue à ${email} ? Tapez « oui » pour confirmer : `);
rl.close();
if (reponse.trim().toLowerCase() !== "oui") {
  console.log("Annulé : rien n'a été envoyé.");
  process.exit(0);
}

// Le nom « Prénom » suffit : prenomDepuisNom le reprend tel quel
const { statut, erreur } = await envoyerMailBienvenue({ email, nom: prenom ?? "" });
if (statut === "envoye") console.log("✓ Mail envoyé.");
else fail(`envoi impossible (${statut}${erreur ? ` : ${erreur}` : ""}).`);
