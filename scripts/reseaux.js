// Génère les publications X (étape 3 ter) d'une fiche DÉJÀ PUBLIÉE (ou, avec
// --brouillon, de son dernier brouillon) et les ajoute à son contenuComplet,
// sous la clé reseaux.
//
//   node scripts/reseaux.js <id> --dry-run
//       → appelle Claude (étape 3 ter, mêmes contrôles que le pipeline),
//         affiche les tweets remplis et les textes des images. N'écrit RIEN.
//   node scripts/reseaux.js <id>
//       → idem, puis sauvegarde la ligne actuelle dans logs/sauvegardes/,
//         demande « oui », et écrit.
//   … --brouillon
//       → même chose sur le dernier brouillon de la fiche (pas encore publié).
//
//   node scripts/reseaux.js --dernieres <n> [--dry-run]
//       → lot : les n dernières fiches publiées qui n'ont pas encore de
//         reseaux. D'abord, sans aucun appel à Claude : la liste (compte X et
//         portrait bleu manquants signalés) et le coût estimé, puis un seul
//         « oui ». Ensuite fiche par fiche : génération, sauvegarde, écriture
//         (rien n'est écrit avec --dry-run). Une fiche en échec est sautée
//         sans arrêter le lot ; récapitulatif à la fin.
//
// <id> : le numéro de la fiche, celui de l'adresse /declarations/<id>.
// Écriture ciblée : seule la clé contenuComplet.reseaux est ajoutée (ou
// remplacée, en mode fiche seulement : le lot ne touche jamais une fiche qui
// en a déjà). Aucun score, aucun statut, aucune autre clé ne change. Refusée
// si la fiche a été modifiée entre la lecture et l'écriture.
// Le script utilise DATABASE_URL (.env, donc la production, sauf si
// DATABASE_URL est définie dans le terminal).
import "dotenv/config";
import { appendFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { avertissementBase, confirmerEcriture, hoteDe } from "./lib/garde-fou-base.js";
import { LOT_MAX, alertesFiche, choisirFiches, estimationCout, recapitulatif } from "./lib/reseaux-lot.js";
import { buildCoutPipeline, genererReseaux } from "./analyze.js";
import { avertissementsReseaux, tweetsReseaux, valeursReseaux, LONGUEUR_X_MAX } from "../src/lib/reseaux.js";
import { handleX } from "../src/lib/handles-x.js";
import { slugCandidat } from "../src/lib/carte.js";

neonConfig.webSocketConstructor = ws;

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SAUVEGARDES_PATH = join(ROOT, "logs", "sauvegardes");
const INSERTIONS_LOG_PATH = join(ROOT, "logs", "insertions.jsonl");
const USAGE =
  "Usage : node scripts/reseaux.js <id de la fiche (/declarations/<id>)> [--dry-run] [--brouillon]\n" +
  "   ou : node scripts/reseaux.js --dernieres <n> [--dry-run]";

function fail(message) {
  console.error(`Erreur : ${message}`);
  process.exit(1);
}

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    "dry-run": { type: "boolean", default: false },
    brouillon: { type: "boolean", default: false },
    dernieres: { type: "string" },
  },
});
const enLot = values.dernieres !== undefined;
const taille = Number(values.dernieres);
if (enLot && (!Number.isInteger(taille) || taille < 1 || taille > LOT_MAX)) fail(`--dernieres attend un nombre entier de 1 à ${LOT_MAX}.\n${USAGE}`);
if (enLot && (positionals.length > 0 || values.brouillon)) fail(`--dernieres ne se combine ni avec un id ni avec --brouillon.\n${USAGE}`);
const propositionId = Number(positionals[0]);
if (!enLot && !Number.isInteger(propositionId)) fail(USAGE);
// Analyse visée : la dernière publiée, ou le dernier brouillon avec --brouillon.
const STATUT = values.brouillon ? "brouillon" : "publie";
if (!process.env.ANTHROPIC_API_KEY) fail("ANTHROPIC_API_KEY n'est pas défini (voir votre fichier .env).");

const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }) });

const coutDe = (usage) => buildCoutPipeline({ usage2: null, usage3: {}, usage3bis: {}, usage3ter: usage }).coutEstimeParEtape.etape3ter;

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
  const avertissements = avertissementsReseaux(reseaux, { valeurs });
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

// Sauvegarde de la ligne actuelle dans logs/sauvegardes/. Renvoie le chemin.
function sauvegarder({ host, analyse, contenu }) {
  mkdirSync(SAUVEGARDES_PATH, { recursive: true });
  const horodatage = new Date().toISOString().replace(/[:.]/g, "-");
  const cible = join(SAUVEGARDES_PATH, `analyse-${analyse.id}-avant-reseaux-${horodatage}.json`);
  writeFileSync(
    cible,
    `${JSON.stringify({ base: host, analyseId: analyse.id, statut: analyse.statut, contenuComplet: contenu }, null, 2)}\n`,
    "utf-8",
  );
  return cible;
}

// Écrit la seule clé reseaux, si personne n'a modifié la fiche entre-temps
// (updatedAt inchangé), puis journalise. Lève une erreur sinon.
async function ecrireReseaux({ host, analyse, contenu, reseaux, propositionId: id, sauvegarde }) {
  const { count } = await prisma.analyse.updateMany({
    where: { id: analyse.id, updatedAt: analyse.updatedAt },
    data: { contenuComplet: { ...contenu, reseaux } },
  });
  if (count !== 1) throw new Error("la fiche a été modifiée pendant la génération, rien n'est écrit.");
  mkdirSync(dirname(INSERTIONS_LOG_PATH), { recursive: true });
  appendFileSync(
    INSERTIONS_LOG_PATH,
    `${JSON.stringify({ date: new Date().toISOString(), base: host, script: "reseaux", analyseId: analyse.id, propositionId: id, sauvegarde })}\n`,
  );
}

// --- Une fiche --------------------------------------------------------------------

async function mainFiche(host) {
  const proposition = await prisma.proposition.findUnique({
    where: { id: propositionId },
    include: {
      candidat: true,
      analyses: { where: { statut: STATUT }, orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  const analyse = proposition?.analyses[0];
  if (!analyse) fail(`aucune analyse ${values.brouillon ? "en brouillon" : "publiée"} pour la fiche ${propositionId}.`);

  const contenu = analyse.contenuComplet ?? {};
  const candidatNom = proposition.candidat.nom;
  console.log(`Fiche ${propositionId}, analyse #${analyse.id} (${analyse.statut}), ${candidatNom}`);
  console.log(`  Titre : ${proposition.titre ?? contenu.titre_fiche}`);
  console.log(`  Score : ${analyse.scoreFaisabilite}/100`);
  console.log(`  Compte X : ${handleX(candidatNom) ?? "non renseigné (src/lib/handles-x.js) : le nom sera utilisé sans @"}`);
  console.log("\nÉtape 3 ter : publications X (Claude)…");

  const { reseaux, usage, errors, derniere } = await genererReseaux(contenu, { candidatNom, score: analyse.scoreFaisabilite });
  console.log(`Coût estimé : ~$${coutDe(usage)} (${usage.input_tokens ?? 0} tokens en entrée, ${usage.output_tokens ?? 0} en sortie)`);
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
  const sauvegarde = sauvegarder({ host, analyse, contenu });
  console.log(`✓ Sauvegarde : ${sauvegarde}`);

  const ok = await confirmerEcriture({
    host,
    question: `Ajouter les publications X à l'analyse ${values.brouillon ? "en brouillon" : "publiée"} #${analyse.id} (fiche ${propositionId}) ?`,
  });
  if (!ok) {
    console.log("Annulé, rien n'a été modifié.");
    return;
  }

  try {
    await ecrireReseaux({ host, analyse, contenu, reseaux, propositionId, sauvegarde });
  } catch (error) {
    fail(`${error.message} Relancez le script.`);
  }
  console.log(`\n✓ Publications X ajoutées à l'analyse #${analyse.id}. Page de partage : /test/reseaux/${propositionId}${values.brouillon ? "?brouillon=1" : ""}`);
}

// --- Lot : les n dernières fiches publiées sans reseaux ---------------------------

// Analyses qui ont déjà des reseaux, calculé par Postgres sans charger le JSON.
async function analysesAvecReseaux() {
  const lignes = await prisma.$queryRaw`
    SELECT id FROM "Analyse"
    WHERE jsonb_exists("contenuComplet", 'reseaux')
  `;
  return new Set(lignes.map((ligne) => Number(ligne.id)));
}

async function mainLot(host) {
  const dryRun = values["dry-run"];
  for (const ligne of avertissementBase(host)) console.log(ligne);

  // 1. Sans aucun appel à Claude : la liste, ce qui manque, le coût estimé.
  const [publiees, avecReseaux] = await Promise.all([
    prisma.analyse.findMany({
      where: { statut: "publie" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        scoreFaisabilite: true,
        createdAt: true,
        proposition: { select: { id: true, titre: true, texteOriginal: true, candidat: { select: { nom: true, photoUrl: true } } } },
      },
    }),
    analysesAvecReseaux(),
  ]);
  const fiches = choisirFiches(publiees, avecReseaux, taille);
  if (fiches.length === 0) {
    console.log("\nAucune fiche publiée sans publications X : rien à faire.");
    return;
  }

  console.log(`\n${fiches.length} fiche(s) publiée(s) sans publications X, de la plus récente à la plus ancienne${fiches.length < taille ? ` (${taille} demandées)` : ""} :`);
  for (const { id, scoreFaisabilite, createdAt, proposition } of fiches) {
    const { candidat } = proposition;
    const titre = proposition.titre ?? proposition.texteOriginal.slice(0, 80);
    console.log(`\n  Fiche ${proposition.id} (analyse #${id}) · ${candidat.nom} · ${scoreFaisabilite}/100 · ${createdAt.toISOString().slice(0, 10)}`);
    console.log(`    ${titre}`);
    const alertes = alertesFiche({
      compteX: handleX(candidat.nom),
      portraitExiste: existsSync(join(ROOT, "public", "portraits-bleus", `${slugCandidat(candidat)}.png`)),
    });
    alertes.forEach((alerte) => console.log(`    ⚠ ${alerte}`));
  }
  const { min, max } = estimationCout(fiches.length);
  console.log(`\nCoût estimé de l'étape 3 ter : entre ~$${min} et ~$${max} (${fiches.length} × 0,05 à 0,16 $).`);
  console.log(dryRun ? "Simulation (--dry-run) : les textes seront générés et affichés, RIEN ne sera écrit." : "Chaque fiche sera sauvegardée puis écrite (clé reseaux seulement).");

  const ok = await confirmerEcriture({
    host,
    question: dryRun
      ? `Générer (sans écrire) les publications X de ces ${fiches.length} fiche(s) ?`
      : `Générer ET écrire les publications X de ces ${fiches.length} fiche(s) ?`,
  });
  if (!ok) {
    console.log("Annulé : aucun appel à Claude, rien n'a été modifié.");
    return;
  }

  // 2. Fiche par fiche ; une fiche en échec est sautée sans arrêter le lot.
  const resultats = [];
  for (const [index, fiche] of fiches.entries()) {
    const id = fiche.proposition.id;
    const candidatNom = fiche.proposition.candidat.nom;
    console.log(`\n=== ${index + 1}/${fiches.length} · fiche ${id} · ${candidatNom} ===`);
    const resultat = { propositionId: id, candidat: candidatNom, cout: 0 };
    try {
      // Relue juste avant : toujours publiée, et toujours sans reseaux.
      const analyse = await prisma.analyse.findUnique({
        where: { id: fiche.id },
        select: { id: true, statut: true, updatedAt: true, scoreFaisabilite: true, contenuComplet: true },
      });
      if (!analyse || analyse.statut !== "publie") throw new Error("l'analyse n'est plus publiée, fiche non touchée.");
      const contenu = analyse.contenuComplet ?? {};
      if (contenu.reseaux) throw new Error("des publications X ont été ajoutées entre-temps, fiche non touchée.");

      const { reseaux, usage, errors } = await genererReseaux(contenu, { candidatNom, score: analyse.scoreFaisabilite });
      resultat.cout = coutDe(usage);
      if (!reseaux) throw new Error(`refusée après deux tentatives : ${errors[0] ?? "raison inconnue"}${errors.length > 1 ? ` (+${errors.length - 1} autre(s))` : ""}`);

      const valeurs = valeursReseaux({ candidatNom, score: analyse.scoreFaisabilite, propositionId: id });
      afficher(reseaux, valeurs);
      const avertissements = avertissementsReseaux(reseaux, { valeurs });
      resultat.avertissements = avertissements.length;
      resultat.aRaccourcir = avertissements.filter((a) => a.fort).length;

      if (dryRun) {
        resultat.statut = "simulee";
        console.log("\n  Simulation : rien n'a été écrit.");
      } else {
        const sauvegarde = sauvegarder({ host, analyse, contenu });
        await ecrireReseaux({ host, analyse, contenu, reseaux, propositionId: id, sauvegarde });
        resultat.statut = "ecrite";
        console.log(`\n  ✓ Écrite (sauvegarde : ${sauvegarde}). Page de partage : /test/reseaux/${id}`);
      }
    } catch (error) {
      resultat.statut = "echec";
      resultat.raison = error.message;
      console.error(`  ✗ Fiche ${id} sautée : ${error.message}`);
    }
    resultats.push(resultat);
  }

  // 3. Récapitulatif.
  console.log("");
  for (const ligne of recapitulatif(resultats, { dryRun })) console.log(ligne);
}

async function main() {
  const host = hoteDe(process.env.DATABASE_URL);
  console.log(`Base ciblée : ${host}\n`);
  if (enLot) await mainLot(host);
  else await mainFiche(host);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
