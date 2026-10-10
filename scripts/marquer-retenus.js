// Marque en base les commentaires retenus d'une fiche archivée, c'est-à-dire
// pris en compte dans sa version suivante (+20 PerlimpinPOINTS pour l'auteur).
//
//   node scripts/marquer-retenus.js <slug>
//       → simulation (par défaut) : affiche ce qui serait marqué, n'écrit RIEN
//   node scripts/marquer-retenus.js <slug> --appliquer
//       → met retenu = true en base pour ces commentaires
//   CI=true node scripts/marquer-retenus.js <slug> --appliquer --oui
//       → sans question, pour le workflow GitHub « Après révision »
//         (.github/workflows/apres-revision.yml). --oui est refusé hors CI. En
//         CI, ni nom d'adhérent ni hôte de la base dans le journal (public),
//         seulement des comptes ; le résumé du job indique les points attribués.
//
// Source : data/relectures/<slug>.json, bloc relecture.archive.reponses ; seules
// les réponses portant "retenu": true sont prises. Mise à jour ciblée : le seul
// champ retenu, des seuls commentaires listés ET rattachés à cette fiche. Le
// script ne remet jamais retenu à false (pour retirer un bonus, le faire à la
// main en base).
//
// L'écriture est journalisée (avec l'hôte Neon écrit, champ « base ») dans
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
import { confirmerEcriture, estProduction, hoteDe } from "./lib/garde-fou-base.js";

neonConfig.webSocketConstructor = ws;

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const INSERTIONS_LOG_PATH = join(ROOT, "logs", "insertions.jsonl");
const USAGE = "Usage : node scripts/marquer-retenus.js <slug> [--dry-run | --appliquer [--oui]]";
const BONUS_RETENU = 20; // PerlimpinPOINTS par commentaire retenu, voir src/lib/club-points-core.js
const CI = process.env.CI === "true";

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
    oui: { type: "boolean", default: false },
  },
  allowPositionals: true,
  strict: true,
});

if (positionals.length !== 1) fail(`un seul slug attendu.\n${USAGE}`);
if (values["dry-run"] && values.appliquer) fail("choisissez --dry-run OU --appliquer, pas les deux.");
if (values.oui && !CI) fail("--oui n'est accepté qu'en intégration continue (CI=true). Sur l'ordinateur, tapez « oui » à la question.");
if (values.oui && !values.appliquer) fail("--oui va avec --appliquer.");
const appliquer = values.appliquer; // simulation par défaut
// En CI, le journal du workflow est public : ni nom d'adhérent ni hôte de la base.
const auteur = (c) => (CI ? "" : ` (${c.authorName ?? "anonyme"})`);
function resume(ligne) {
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${ligne}\n`);
}
const slug = positionals[0];
if (!/^[a-z0-9-]+$/.test(slug)) fail(`slug invalide « ${slug} » (minuscules, chiffres et tirets).\n${USAGE}`);

const source = `data/relectures/${slug}.json`;
let fiche;
try {
  fiche = JSON.parse(readFileSync(join(ROOT, source), "utf8"));
} catch (error) {
  fail(`lecture de ${source} impossible (${error.code ?? error.message}).`);
}

const reponses = fiche.relecture?.archive?.reponses;
if (!Array.isArray(reponses)) fail(`${source} : pas de bloc relecture.archive.reponses (fiche non archivée ?).`);
const invalide = reponses.findIndex((x) => x && "retenu" in x && typeof x.retenu !== "boolean");
if (invalide >= 0) fail(`${source} : réponse n° ${invalide + 1} : "retenu" doit valoir true ou false.`);

const ids = [...new Set(reponses.filter((x) => x?.retenu === true && x.commentaire_id).map((x) => String(x.commentaire_id)))];
console.log(`Fiche : ${slug} · réponses : ${reponses.length} · marquées "retenu": true : ${ids.length}`);
if (ids.length === 0) {
  console.log("Rien à marquer.");
  resume(`Fiche \`${slug}\` : aucun commentaire retenu, aucun point attribué.`);
  process.exit(0);
}

if (!process.env.DATABASE_URL) fail("DATABASE_URL absente (fichier .env).");
const host = hoteDe(process.env.DATABASE_URL);
if (!host) fail("DATABASE_URL illisible.");
const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }) });

try {
  const enBase = await prisma.relectureComment.findMany({
    where: { id: { in: ids } },
    select: { id: true, ficheSlug: true, authorName: true, retenu: true },
  });
  const parId = new Map(enBase.map((c) => [c.id, c]));

  const aMarquer = [];
  console.log(`\nBase : ${CI ? (estProduction(host) ? "production" : "copie / test") : host}`);
  for (const id of ids) {
    const c = parId.get(id);
    if (!c) console.log(`  ? ${id} : introuvable en base, ignoré.`);
    else if (c.ficheSlug !== slug) console.log(`  ! ${id} : appartient à la fiche « ${c.ficheSlug} », ignoré.`);
    else if (c.retenu) console.log(`  = ${id}${auteur(c)} : déjà retenu.`);
    else {
      console.log(`  + ${id}${auteur(c)}`);
      aMarquer.push(id);
    }
  }
  console.log(`À marquer : ${aMarquer.length}`);

  if (!appliquer) {
    console.log("\nSimulation : rien n'a été écrit. Relancez avec --appliquer pour marquer ces commentaires.");
  } else if (aMarquer.length === 0) {
    console.log("\nRien à marquer.");
    resume(`Fiche \`${slug}\` : commentaires déjà marqués comme retenus, aucun nouveau point.`);
  } else if (!values.oui && !(await confirmerEcriture({ host, question: `Marquer ${aMarquer.length} commentaire(s) comme retenu(s) ?` }))) {
    console.log("Annulé : rien n'a été écrit.");
  } else {
    // ficheSlug répété dans le where : on ne touche qu'aux commentaires de cette fiche.
    const { count } = await prisma.relectureComment.updateMany({
      where: { id: { in: aMarquer }, ficheSlug: slug, retenu: false },
      data: { retenu: true },
    });
    appendJsonLine(INSERTIONS_LOG_PATH, {
      timestamp: new Date().toISOString(),
      type: "commentaires_retenus",
      ficheSlug: slug,
      commentaireIds: aMarquer,
      nb: count,
      source,
      base: host,
    });
    console.log(`\n${count} commentaire(s) marqué(s) comme retenu(s). Journal : ${INSERTIONS_LOG_PATH}`);
    resume(
      `Fiche \`${slug}\` : ${count} commentaire(s) retenu(s), soit +${count * BONUS_RETENU} PerlimpinPOINTS attribués (${BONUS_RETENU} par commentaire).`,
    );
  }
} finally {
  await prisma.$disconnect();
}
