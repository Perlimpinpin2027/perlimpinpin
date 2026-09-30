// Réinitialise le compte d'un adhérent qui a oublié son mot de passe (en
// attendant le « mot de passe oublié » par e-mail) : efface son mot de passe
// (motDePasseHash et activatedAt remis à null). L'adhérent recrée ensuite son
// mot de passe sur /relectures/inscription, avec la même adresse. Ses sessions
// ouvertes cessent d'être valides.
//
//   node scripts/reset-adherent.js --email prenom@exemple.fr
//
// Le script utilise DATABASE_URL (.env, donc la production, sauf si DATABASE_URL
// est définie dans le terminal). Avant d'écrire, il affiche l'hôte Neon ciblé et
// demande de taper « oui ».
import "dotenv/config";
import { parseArgs } from "node:util";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { normalizeEmail } from "../src/lib/live-password.js";
import { confirmerEcriture, hoteDe } from "./lib/garde-fou-base.js";

neonConfig.webSocketConstructor = ws;

const USAGE = "Usage : node scripts/reset-adherent.js --email <adresse>";

function fail(message) {
  console.error(`Erreur : ${message}`);
  process.exit(1);
}

const { values } = parseArgs({ options: { email: { type: "string" } }, strict: true });
const email = normalizeEmail(values.email);
if (!email) fail(`adresse e-mail manquante ou invalide.\n${USAGE}`);

if (!process.env.DATABASE_URL) fail("DATABASE_URL absente (fichier .env).");
const host = hoteDe(process.env.DATABASE_URL);
if (!host) fail("DATABASE_URL illisible.");
const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }) });

try {
  const adherent = await prisma.adherent.findUnique({
    where: { email },
    select: { id: true, nom: true, motDePasseHash: true, activatedAt: true },
  });
  if (!adherent) fail(`aucun adhérent pour ${email} (base : ${host}).`);
  if (!adherent.motDePasseHash) {
    console.log(`${adherent.nom} <${email}> n'a pas encore de mot de passe : rien à réinitialiser.`);
  } else {
    const activation = adherent.activatedAt ? adherent.activatedAt.toISOString() : "date inconnue";
    console.log(`Adhérent : ${adherent.nom} <${email}> (n°${adherent.id}, activé le ${activation})`);

    if (!(await confirmerEcriture({ host, question: "Effacer son mot de passe ?" }))) {
      console.log("Annulé : rien n'a été modifié.");
    } else {
      await prisma.adherent.update({
        where: { id: adherent.id },
        data: { motDePasseHash: null, activatedAt: null },
      });
      console.log(`Mot de passe effacé. ${adherent.nom} peut en recréer un sur /relectures/inscription.`);
    }
  }
} finally {
  await prisma.$disconnect();
}
