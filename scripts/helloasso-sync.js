// Synchronisation manuelle des adhésions HelloAsso → comptes Adherent (Club).
// Même logique que la notification et la synchro quotidienne
// (src/lib/helloasso-core.js) ; sert surtout au premier remplissage.
//
//   node scripts/helloasso-sync.js --depuis 2026-01-01
//       → simulation (par défaut) : liste les adhésions lues et ce qui serait créé
//   node scripts/helloasso-sync.js --depuis 2026-01-01 --appliquer
//       → crée les comptes manquants (après confirmation « oui »)
//
// Sans --depuis : les 7 derniers jours. Création uniquement : un compte existant
// n'est jamais modifié. Chaque création est journalisée (avec l'hôte Neon, champ
// « base ») dans logs/insertions.jsonl. Variables HELLOASSO_* et DATABASE_URL lues
// dans .env, sauf si elles sont définies dans le terminal (c'est ainsi qu'on vise
// la sandbox et une branche Neon de test).
import "dotenv/config";
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { listMembershipOrders } from "../src/lib/helloasso.js";
import { enregistrerAdhesion, lireConfigHelloasso, masquerEmail, resumer } from "../src/lib/helloasso-core.js";
import { confirmerEcriture, hoteDe } from "./lib/garde-fou-base.js";

neonConfig.webSocketConstructor = ws;

const __dirname = dirname(fileURLToPath(import.meta.url));
const INSERTIONS_LOG_PATH = join(__dirname, "..", "logs", "insertions.jsonl");
const USAGE = "Usage : node scripts/helloasso-sync.js [--depuis AAAA-MM-JJ] [--appliquer]";

function fail(message) {
  console.error(`Erreur : ${message}`);
  process.exit(1);
}

const { values } = parseArgs({
  options: {
    depuis: { type: "string" },
    appliquer: { type: "boolean", default: false },
  },
  strict: true,
});

let from;
if (values.depuis === undefined) {
  from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
} else {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(values.depuis)) fail(`date attendue au format AAAA-MM-JJ.\n${USAGE}`);
  from = new Date(`${values.depuis}T00:00:00Z`);
  if (Number.isNaN(from.getTime()) || from.toISOString().slice(0, 10) !== values.depuis) fail(`date invalide : ${values.depuis}`);
  if (from > new Date()) fail("la date --depuis est dans le futur.");
}

const config = lireConfigHelloasso();
if (!config) fail("variables HELLOASSO_* absentes ou incomplètes (voir .env.example).");
if (!process.env.DATABASE_URL) fail("DATABASE_URL absente (fichier .env).");
const host = hoteDe(process.env.DATABASE_URL);
if (!host) fail("DATABASE_URL illisible.");

console.log(`HelloAsso : ${config.apiBase} ${config.sandbox ? "(SANDBOX)" : "(PRODUCTION)"}`);
console.log(`Formulaire : ${config.organisation} / ${config.formulaire}`);
console.log(`Adhésions depuis le ${from.toISOString().slice(0, 10)}`);
console.log(`Base : ${host}`);

const commandes = await listMembershipOrders(config, { from }).catch((error) => fail(error.message));
const client = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }) });

// Migration 20261002100000_add_adherent_helloasso pas encore appliquée sur cette
// base : la simulation reste possible (comptes existants repérés par e-mail
// seulement), l'écriture non.
const colonnes = await client.$queryRaw`
  SELECT column_name::text AS nom FROM information_schema.columns
  WHERE table_name = 'Adherent' AND column_name = 'helloassoOrderId'`;
const migrationAppliquee = colonnes.length > 0;
let prisma = client;
if (!migrationAppliquee) {
  if (values.appliquer) {
    await client.$disconnect();
    fail("migration add_adherent_helloasso non appliquée sur cette base : écriture impossible.");
  }
  console.log("⚠  Migration add_adherent_helloasso non appliquée : comptes existants repérés par e-mail seulement.");
  prisma = {
    adherent: {
      findFirst: ({ where, select }) =>
        client.adherent.findFirst({ where: { OR: where.OR.filter((c) => "email" in c) }, select }),
    },
  };
}

const decrire = (r) => {
  const qui = r.email ? `${r.nom} <${masquerEmail(r.email)}>` : "";
  if (r.resultat === "aCreer") return `  + commande ${r.orderId} : ${qui} — à créer`;
  if (r.resultat === "creee") return `  + commande ${r.orderId} : ${qui} — créé (adhérent ${r.adherentId})`;
  if (r.resultat === "dejaPresente") return `  = commande ${r.orderId} : ${qui} — déjà en base, inchangé`;
  return `  - commande ${r.orderId ?? "?"} : ignorée (${r.raison})`;
};

try {
  // 1. Simulation : rien n'est écrit
  const simules = [];
  for (const order of commandes) simules.push(await enregistrerAdhesion({ prisma, order, config, simulation: true }));
  console.log(`\n${commandes.length} commande(s) lue(s) :`);
  for (const r of simules) console.log(decrire(r));
  const aCreer = simules.filter((r) => r.resultat === "aCreer").length;
  console.log(`\nRésumé : ${JSON.stringify(resumer(simules))}`);

  if (!values.appliquer) {
    console.log("\nSimulation : rien n'a été écrit. Relancez avec --appliquer pour créer ces comptes.");
  } else if (aCreer === 0) {
    console.log("\nRien à créer.");
  } else if (!(await confirmerEcriture({ host, question: `Créer ${aCreer} adhérent(s) dans cette base ?` }))) {
    console.log("Annulé : rien n'a été écrit.");
  } else {
    // 2. Écriture : chaque commande est retraitée (l'état a pu changer entre-temps)
    const resultats = [];
    for (const order of commandes) {
      const r = await enregistrerAdhesion({ prisma, order, config });
      resultats.push(r);
      if (r.resultat !== "creee") continue;
      console.log(decrire(r));
      mkdirSync(dirname(INSERTIONS_LOG_PATH), { recursive: true });
      appendFileSync(
        INSERTIONS_LOG_PATH,
        `${JSON.stringify({
          timestamp: new Date().toISOString(),
          type: "adherent",
          adherentId: r.adherentId,
          email: r.email,
          nom: r.nom,
          source: "helloasso",
          helloassoOrderId: r.orderId,
          base: host,
        })}\n`,
      );
    }
    console.log(`\nRésumé : ${JSON.stringify(resumer(resultats))}. Journal : ${INSERTIONS_LOG_PATH}`);
  }
} finally {
  await client.$disconnect();
}
