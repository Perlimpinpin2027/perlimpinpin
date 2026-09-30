// Import de la liste des adhérents (espace personnel de /relectures).
// Seules les adresses importées ici peuvent ensuite créer leur compte sur
// /relectures/inscription (l'adhérent choisit lui-même son mot de passe).
//
//   node scripts/import-adherents.js chemin/adherents.csv
//       → simulation (par défaut) : affiche ce qui serait créé, n'écrit RIEN
//   node scripts/import-adherents.js chemin/adherents.csv --appliquer
//       → crée en base les adhérents absents
//
// CSV : une ligne « email;nom » ou « email,nom » par adhérent (en-tête
// facultatif). Le séparateur est détecté sur la première ligne ; un nom qui
// contient le séparateur se met entre guillemets ("Dupont, Camille").
// Les lignes invalides sont listées et ignorées.
//
// Création uniquement : une adresse déjà présente en base n'est jamais modifiée
// (ni son nom, ni son mot de passe). Chaque création est journalisée (avec
// l'hôte Neon écrit, champ « base ») dans
// logs/insertions.jsonl. Le script utilise DATABASE_URL (.env, donc la
// production, sauf si DATABASE_URL est définie dans le terminal). Avant
// d'écrire, il affiche l'hôte Neon ciblé et demande de taper « oui ».
import "dotenv/config";
import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { lireCsvAdherents } from "./lib/adherents-csv.js";
import { confirmerEcriture, hoteDe } from "./lib/garde-fou-base.js";

neonConfig.webSocketConstructor = ws;

const __dirname = dirname(fileURLToPath(import.meta.url));
const INSERTIONS_LOG_PATH = join(__dirname, "..", "logs", "insertions.jsonl");
const USAGE = "Usage : node scripts/import-adherents.js <fichier.csv> [--dry-run | --appliquer]";

function fail(message) {
  console.error(`Erreur : ${message}`);
  process.exit(1);
}

function appendJsonLine(path, entry) {
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, `${JSON.stringify(entry)}\n`);
}

const { values, positionals } = parseArgs({
  options: {
    "dry-run": { type: "boolean", default: false },
    appliquer: { type: "boolean", default: false },
  },
  allowPositionals: true,
  strict: true,
});

if (positionals.length !== 1) fail(`un seul fichier CSV attendu.\n${USAGE}`);
if (values["dry-run"] && values.appliquer) fail("choisissez --dry-run OU --appliquer, pas les deux.");
const appliquer = values.appliquer; // simulation par défaut
const source = positionals[0];

let texte;
try {
  texte = readFileSync(source, "utf8");
} catch (error) {
  fail(`lecture de ${source} impossible (${error.code ?? error.message}).`);
}

const { separateur, valides, invalides } = lireCsvAdherents(texte);
console.log(`Séparateur détecté : « ${separateur} »`);

if (invalides.length > 0) {
  console.log(`\nLignes ignorées (${invalides.length}) :`);
  for (const { ligne, contenu, raison } of invalides) console.log(`  ligne ${ligne} : ${raison}  →  ${contenu}`);
}

if (!process.env.DATABASE_URL) fail("DATABASE_URL absente (fichier .env).");
const host = hoteDe(process.env.DATABASE_URL);
if (!host) fail("DATABASE_URL illisible.");
const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }) });

try {
  const existants = new Set(
    (
      await prisma.adherent.findMany({
        where: { email: { in: valides.map((v) => v.email) } },
        select: { email: true },
      })
    ).map((a) => a.email),
  );
  const nouveaux = valides.filter((v) => !existants.has(v.email));

  console.log(`\nBase : ${host}`);
  console.log(`Lignes valides : ${valides.length} · déjà en base (inchangées) : ${existants.size} · à créer : ${nouveaux.length}`);
  for (const { email, nom } of nouveaux) console.log(`  + ${nom} <${email}>`);

  if (!appliquer) {
    console.log("\nSimulation : rien n'a été écrit. Relancez avec --appliquer pour créer ces adhérents.");
  } else if (nouveaux.length === 0) {
    console.log("\nRien à créer.");
  } else if (!(await confirmerEcriture({ host, question: `Créer ${nouveaux.length} adhérent(s) dans cette base ?` }))) {
    console.log("Annulé : rien n'a été écrit.");
  } else {
    let crees = 0;
    for (const { email, nom } of nouveaux) {
      try {
        const adherent = await prisma.adherent.create({ data: { email, nom }, select: { id: true } });
        crees += 1;
        appendJsonLine(INSERTIONS_LOG_PATH, {
          timestamp: new Date().toISOString(),
          type: "adherent",
          adherentId: adherent.id,
          email,
          nom,
          source,
          // Hôte Neon écrit (production ou branche de test) : sans lui, deux
          // lignes « adherentId 1 » de bases différentes sont indiscernables.
          base: host,
        });
      } catch (error) {
        // P2002 : adresse créée entre-temps (autre import en parallèle) — on ne touche à rien
        if (error?.code === "P2002") console.log(`  = ${email} existe déjà : ignorée.`);
        else throw error;
      }
    }
    console.log(`\n${crees} adhérent(s) créé(s). Journal : ${INSERTIONS_LOG_PATH}`);
  }
} finally {
  await prisma.$disconnect();
}
