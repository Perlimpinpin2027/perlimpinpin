// Génère les publications X (étape 3 ter) d'une fiche DÉJÀ PUBLIÉE et les
// ajoute à son contenuComplet, sous la clé reseaux.
//
//   node scripts/reseaux.js <id> --dry-run
//       → appelle Claude (étape 3 ter, mêmes contrôles que le pipeline),
//         affiche les tweets remplis et les textes des images. N'écrit RIEN.
//   node scripts/reseaux.js <id>
//       → idem, puis sauvegarde la ligne actuelle dans logs/sauvegardes/,
//         demande « oui », et écrit.
//
// <id> : le numéro de la fiche, celui de l'adresse /declarations/<id>.
// Écriture ciblée : seule la clé contenuComplet.reseaux est ajoutée (ou
// remplacée). Aucun score, aucun statut, aucune autre clé ne change. Refusée
// si la fiche a été modifiée entre la lecture et l'écriture.
// Le script utilise DATABASE_URL (.env, donc la production, sauf si
// DATABASE_URL est définie dans le terminal).
import "dotenv/config";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { confirmerEcriture, hoteDe } from "./lib/garde-fou-base.js";
import { buildCoutPipeline, genererReseaux } from "./analyze.js";
import { avertissementsReseaux, tweetsReseaux, valeursReseaux, LONGUEUR_X_MAX } from "../src/lib/reseaux.js";
import { handleX } from "../src/lib/handles-x.js";

neonConfig.webSocketConstructor = ws;

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SAUVEGARDES_PATH = join(ROOT, "logs", "sauvegardes");
const INSERTIONS_LOG_PATH = join(ROOT, "logs", "insertions.jsonl");
const USAGE = "Usage : node scripts/reseaux.js <id de la fiche (/declarations/<id>)> [--dry-run]";

function fail(message) {
  console.error(`Erreur : ${message}`);
  process.exit(1);
}

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { "dry-run": { type: "boolean", default: false } },
});
const propositionId = Number(positionals[0]);
if (!Number.isInteger(propositionId)) fail(USAGE);
if (!process.env.ANTHROPIC_API_KEY) fail("ANTHROPIC_API_KEY n'est pas défini (voir votre fichier .env).");

const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }) });

function afficher(reseaux, valeurs) {
  for (const tweet of tweetsReseaux(reseaux, valeurs)) {
    const alerte = tweet.longueur > LONGUEUR_X_MAX ? "  ⚠️ TROP LONG" : "";
    console.log(`\n--- ${tweet.cle} (${tweet.longueur}/${LONGUEUR_X_MAX})${alerte}\n${tweet.texte}`);
  }
  // Tolère une réponse incomplète (dernière tentative refusée).
  console.log("\n--- Image « chiffre »");
  console.log(`  ${reseaux.chiffre?.valeur ?? "(absent)"} : ${reseaux.chiffre?.explication ?? "(absente)"}`);
  console.log("--- Image « tient / tient pas »");
  console.log(`  ${reseaux.tient?.titre ?? "(absent)"}`);
  const avertissements = avertissementsReseaux(reseaux);
  if (avertissements.length > 0) {
    console.log("\n--- À relire (avertissements, sans refus)");
    avertissements.forEach(({ cle, message }) => console.log(`  ⚠ ${cle} : ${message}`));
  }
  // Chaque point de l'image, et dessous sa version courte (tweet).
  for (const [emoji, textes, courts] of [
    ["✅", reseaux.tient?.tient ?? [], reseaux.tient?.tient_court ?? []],
    ["❌", reseaux.tient?.tient_pas ?? [], reseaux.tient?.tient_pas_court ?? []],
  ]) {
    textes.forEach((texte, i) => {
      console.log(`  ${emoji} ${texte}`);
      if (courts[i]) console.log(`     ↳ court${i >= 2 ? " (non repris dans le tweet)" : ""} : ${courts[i]}`);
    });
  }
}

async function main() {
  const host = hoteDe(process.env.DATABASE_URL);
  console.log(`Base ciblée : ${host}\n`);

  const proposition = await prisma.proposition.findUnique({
    where: { id: propositionId },
    include: {
      candidat: true,
      analyses: { where: { statut: "publie" }, orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  const analyse = proposition?.analyses[0];
  if (!analyse) fail(`aucune analyse publiée pour la fiche ${propositionId}.`);

  const contenu = analyse.contenuComplet ?? {};
  const candidatNom = proposition.candidat.nom;
  console.log(`Fiche ${propositionId}, analyse #${analyse.id} (${analyse.statut}), ${candidatNom}`);
  console.log(`  Titre : ${proposition.titre ?? contenu.titre_fiche}`);
  console.log(`  Score : ${analyse.scoreFaisabilite}/100`);
  console.log(`  Compte X : ${handleX(candidatNom) ?? "non renseigné (src/lib/handles-x.js) : le nom sera utilisé sans @"}`);
  console.log("\nÉtape 3 ter : publications X (Claude)…");

  const { reseaux, usage, errors, derniere } = await genererReseaux(contenu, { candidatNom, score: analyse.scoreFaisabilite });
  const cout = buildCoutPipeline({ usage2: null, usage3: {}, usage3bis: {}, usage3ter: usage }).coutEstimeParEtape.etape3ter;
  console.log(`Coût estimé : ~$${cout} (${usage.input_tokens ?? 0} tokens en entrée, ${usage.output_tokens ?? 0} en sortie)`);
  const valeurs = valeursReseaux({ candidatNom, score: analyse.scoreFaisabilite, propositionId });
  if (!reseaux) {
    // Dernière réponse refusée, marqueurs remplis : à relire sans nouvel appel payant.
    if (derniere) {
      console.log("\n=== Dernière tentative REFUSÉE (rien n'est enregistré) ===");
      afficher(derniere, valeurs);
      console.log("\nErreurs :");
      errors.forEach((erreur) => console.log(`  - ${erreur}`));
    }
    fail("publications X refusées après deux tentatives, rien n'est modifié.");
  }

  afficher(reseaux, valeurs);

  if (values["dry-run"]) {
    console.log("\nSimulation (--dry-run) : rien n'a été écrit.");
    return;
  }

  console.log(`\ncontenuComplet.reseaux : ${contenu.reseaux ? "REMPLACÉE" : "ajoutée"}`);
  mkdirSync(SAUVEGARDES_PATH, { recursive: true });
  const horodatage = new Date().toISOString().replace(/[:.]/g, "-");
  const cible = join(SAUVEGARDES_PATH, `analyse-${analyse.id}-avant-reseaux-${horodatage}.json`);
  writeFileSync(
    cible,
    `${JSON.stringify({ base: host, analyseId: analyse.id, statut: analyse.statut, contenuComplet: contenu }, null, 2)}\n`,
    "utf-8",
  );
  console.log(`✓ Sauvegarde : ${cible}`);

  const ok = await confirmerEcriture({
    host,
    question: `Ajouter les publications X à l'analyse publiée #${analyse.id} (fiche ${propositionId}) ?`,
  });
  if (!ok) {
    console.log("Annulé, rien n'a été modifié.");
    return;
  }

  // updatedAt inchangé : personne n'a modifié la fiche pendant la génération.
  const { count } = await prisma.analyse.updateMany({
    where: { id: analyse.id, updatedAt: analyse.updatedAt },
    data: { contenuComplet: { ...contenu, reseaux } },
  });
  if (count !== 1) fail("la fiche a été modifiée pendant la génération, rien n'est écrit. Relancez le script.");

  mkdirSync(dirname(INSERTIONS_LOG_PATH), { recursive: true });
  appendFileSync(
    INSERTIONS_LOG_PATH,
    `${JSON.stringify({ date: new Date().toISOString(), base: host, script: "reseaux", analyseId: analyse.id, propositionId, sauvegarde: cible })}\n`,
  );
  console.log(`\n✓ Publications X ajoutées à l'analyse #${analyse.id}. Page de partage : /test/reseaux/${propositionId}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
