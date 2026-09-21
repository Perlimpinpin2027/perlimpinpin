// Création (ou réinitialisation du mot de passe) d'un compte journaliste pour /live.
// Pas d'auto-inscription ni d'interface d'administration : les comptes se créent ici,
// en local, par Arno.
//
//   node scripts/create-live-user.js --email prenom@exemple.fr --nom "Prénom Nom"
//       → demande le mot de passe (saisie masquée, deux fois)
//   node scripts/create-live-user.js --email ... --nom "..." --generer
//       → génère un mot de passe temporaire aléatoire et l'affiche UNE fois
//   node scripts/create-live-user.js --email ... --nom "..." --password "..."
//       → mot de passe en argument (à éviter : reste dans l'historique du terminal)
//
// Options :
//   --reinitialiser        change le mot de passe d'un compte EXISTANT (le nom est
//                          alors facultatif et ne change pas s'il est omis)
//   --reprendre-favoris    ajoute aux favoris de ce compte les analyses qui étaient en
//                          favori partagé avant les comptes individuels
//
// Le mot de passe n'est jamais stocké en clair : uniquement son hachage bcrypt. Le script
// utilise DATABASE_URL (.env) : c'est la base de production, il en affiche le serveur.
import "dotenv/config";
import { createInterface } from "node:readline";
import { parseArgs } from "node:util";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import {
  generateTemporaryPassword,
  hashPassword,
  normalizeEmail,
  passwordProblem,
} from "../src/lib/live-password.js";

neonConfig.webSocketConstructor = ws;

const USAGE = `Usage : node scripts/create-live-user.js --email <adresse> --nom "<Prénom Nom>" [--generer | --password <mot de passe>] [--reinitialiser] [--reprendre-favoris]`;

function fail(message) {
  console.error(`Erreur : ${message}`);
  process.exit(1);
}

// Saisie sans écho (les caractères tapés s'affichent en « * »)
function askHidden(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    let muted = false;
    rl._writeToOutput = (text) => {
      if (muted && text !== "\r\n" && text !== "\n") rl.output.write("*");
      else rl.output.write(text);
    };
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
    muted = true;
  });
}

const { values } = parseArgs({
  options: {
    email: { type: "string" },
    nom: { type: "string" },
    password: { type: "string" },
    generer: { type: "boolean", default: false },
    reinitialiser: { type: "boolean", default: false },
    "reprendre-favoris": { type: "boolean", default: false },
  },
  strict: true,
});

const email = normalizeEmail(values.email);
if (!email) fail(`adresse e-mail manquante ou invalide.\n${USAGE}`);
const nom = typeof values.nom === "string" ? values.nom.trim().replace(/\s+/g, " ") : "";
if (!values.reinitialiser && (nom.length < 2 || nom.length > 80)) fail(`le nom (2 à 80 caractères) est obligatoire.\n${USAGE}`);
if (values.generer && values.password) fail("choisissez --generer OU --password, pas les deux.");

if (!process.env.DATABASE_URL) fail("DATABASE_URL absente (fichier .env).");
const host = new URL(process.env.DATABASE_URL).hostname;

// --- Mot de passe ------------------------------------------------------------
let password;
let generated = false;
if (values.generer) {
  password = generateTemporaryPassword();
  generated = true;
} else if (typeof values.password === "string") {
  password = values.password;
} else {
  password = await askHidden("Mot de passe : ");
  const confirmation = await askHidden("Confirmer le mot de passe : ");
  if (password !== confirmation) fail("les deux saisies ne correspondent pas.");
}
const problem = passwordProblem(password);
if (problem) fail(problem);

// --- Base --------------------------------------------------------------------
const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }) });

try {
  const existing = await prisma.liveUser.findUnique({ where: { email }, select: { id: true, nom: true } });
  const motDePasseHash = await hashPassword(password);
  let user;

  if (existing && !values.reinitialiser) {
    fail(`un compte existe déjà pour ${email} (nom : ${existing.nom}). Ajoutez --reinitialiser pour changer son mot de passe.`);
  } else if (existing) {
    user = await prisma.liveUser.update({
      where: { id: existing.id },
      data: { motDePasseHash, ...(nom ? { nom } : {}) },
      select: { id: true, email: true, nom: true },
    });
    console.log(`Mot de passe réinitialisé pour ${user.nom} <${user.email}> (base : ${host}).`);
  } else if (values.reinitialiser) {
    fail(`aucun compte pour ${email} : retirez --reinitialiser pour le créer.`);
  } else {
    user = await prisma.liveUser.create({ data: { email, nom, motDePasseHash }, select: { id: true, email: true, nom: true } });
    console.log(`Compte créé : ${user.nom} <${user.email}> (n°${user.id}, base : ${host}).`);
  }

  if (values["reprendre-favoris"]) {
    const legacy = await prisma.liveAnalyse.findMany({ where: { favori: true }, select: { id: true } });
    const result = await prisma.liveFavori.createMany({
      data: legacy.map((analyse) => ({ userId: user.id, analyseId: analyse.id })),
      skipDuplicates: true,
    });
    console.log(`Favoris partagés d'avant les comptes repris : ${result.count} analyse(s) ajoutée(s) aux favoris de ${user.nom}.`);
  }

  if (generated) {
    console.log(`\nMot de passe temporaire (affiché une seule fois) : ${password}\nCommuniquez-le à ${user.nom} par un canal privé.`);
  }
} finally {
  await prisma.$disconnect();
}
