// Robot de révision d'une relecture close, lancé par
// .github/workflows/revision-relecture.yml (bouton « Envoyer en révision »).
//
//   node scripts/reviser-relecture.js <slug> [--sortie <dossier>]
//
//   1. Lit data/relectures/<slug>.json (arrêt si la fiche est déjà archivée).
//   2. Lit en base, en lecture seule : les commentaires de la fiche, les
//      candidats, les propositions du candidat (anti-doublon).
//   3. Lance analyze.js (étapes 2, 3 et 3 bis) sur la fiche relue, sans son bloc
//      relecture, avec --commentaires : la fiche finale est créée en brouillon
//      (--auto --seuil-score 0 : création seule, jamais d'upsert).
//   4. Écrit la sortie de l'étape 3 et l'avis Mistral dans data/analyses finales/,
//      le bloc relecture.archive (construit par le code) dans la fiche, puis
//      reconstruit public/relectures/index.html.
//   5. Écrit dans <dossier> (défaut : tmp/revision-<slug>) : rapport.md (corps
//      de la PR et résumé du job), fichiers.txt (fichiers à commiter).
//
//   node scripts/reviser-relecture.js <slug> --dry-run [--sortie <dossier>]
//       → simulation : rejoue la révision d'une relecture (même déjà close)
//         avec ses commentaires, étapes 2 et 3 seulement. Affiche le coût
//         estimé et demande « oui » avant tout appel payant. N'écrit rien en
//         base ni dans le dépôt : seulement resultat.json et rapport.md dans
//         <dossier> (défaut : tmp/revision-<slug>). Lit les commentaires dans
//         la base de DATABASE_URL (lecture seule).
//
// Aucun nom ni e-mail d'adhérent dans les logs : seulement des comptes. Les
// noms (prénom abrégé, authorName) ne vont que dans le bloc archive, comme
// pour les relectures traitées à la main.

import "dotenv/config";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { SLUG_PATTERN, erreursVersionSuivante } from "./relecture.js";
import { verifierArchive } from "./build-relectures.js";
import {
  RevisionError, cheminsSorties, commentairesPourModele, construireArchive, dateParis, estimationCoutSimulation,
  rapportMarkdown, sourceDepuisRelecture, themeDuSite, trouverDoublon, verifierCandidat,
} from "./lib/revision-relecture.js";

// Taille des consignes de l'étape 3 hors fiche et commentaires (gabarit de
// data/prompt-methodologie.md + data/prompt-etape3-corrections.md), en
// caractères, pour l'estimation de coût d'une simulation.
const CONSIGNES_ETAPE3_CARACTERES = 20_000;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const json = (obj) => `${JSON.stringify(obj, null, 2)}\n`;

async function prisma() {
  if (!process.env.DATABASE_URL) throw new RevisionError("DATABASE_URL absent.");
  const { PrismaClient } = await import("../src/generated/prisma/client.ts");
  const { PrismaNeon } = await import("@prisma/adapter-neon");
  const { neonConfig } = await import("@neondatabase/serverless");
  neonConfig.webSocketConstructor = (await import("ws")).default;
  return new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }) });
}

// Lectures en base (lecture seule).
async function lireBase(slug, candidat) {
  const db = await prisma();
  try {
    const commentaires = await db.relectureComment.findMany({
      where: { ficheSlug: slug },
      orderBy: { createdAt: "asc" },
      select: { id: true, sectionLabel: true, body: true, quotedText: true, authorName: true },
    });
    const noms = (await db.candidat.findMany({ select: { nom: true } })).map((c) => c.nom);
    const propositions = await db.proposition.findMany({
      where: { candidat: { nom: candidat } },
      select: { id: true, titre: true, texteOriginal: true, analyses: { select: { id: true, createdAt: true, contenuComplet: true } } },
    });
    return { commentaires, noms, propositions };
  } finally {
    await db.$disconnect();
  }
}

// simulation (--dry-run) : voir l'en-tête. `confirmer(estimation)` décide de
// lancer ou non les appels payants (true pour lancer).
export async function reviser(slug, { sortie, root = ROOT, lire = lireBase, lancerAnalyze, build, maintenant = new Date(), log = console.log, simulation = false, confirmer } = {}) {
  if (!SLUG_PATTERN.test(String(slug))) throw new RevisionError(`Slug invalide : « ${slug} ».`);
  const cheminFiche = path.join(root, "data/relectures", `${slug}.json`);
  if (!existsSync(cheminFiche)) throw new RevisionError(`data/relectures/${slug}.json introuvable.`);
  const fiche = JSON.parse(readFileSync(cheminFiche, "utf8"));
  const { relecture, ...ficheRelue } = fiche;
  if (relecture?.archive && !simulation) throw new RevisionError("Fiche déjà archivée : la révision a déjà été faite.");
  if (simulation) return simuler(slug, { relecture, ficheRelue, sortie, lire, lancerAnalyze, log, confirmer });

  // Paramètres d'analyze.js.
  const candidat = String(relecture.candidat ?? "").trim();
  const { theme, remplace } = themeDuSite(relecture.theme);
  const source = sourceDepuisRelecture(relecture);
  const sorties = cheminsSorties(slug, candidat);
  const avertissements = [];
  if (remplace) avertissements.push(`Thème « ${relecture.theme} » remplacé par « ${theme} » (table TABLE_THEMES).`);
  if (sorties.deduit) avertissements.push(`Dossier « ${sorties.dossier} » déduit du nom du candidat (absent de DOSSIERS_CANDIDATS).`);

  // Base (lecture seule).
  const { commentaires, noms, propositions } = await lire(slug, candidat);
  log(`Fiche « ${slug} » : ${commentaires.length} commentaire(s) en base.`);
  verifierCandidat(candidat, noms);
  const doublon = trouverDoublon({
    propositions,
    source,
    titre: relecture.titre,
    objectifCourt: ficheRelue.mesure_vers_objectif?.objectif_court,
    depuis: relecture.date,
  });
  if (doublon) {
    throw new RevisionError(
      `Déjà analysée : ${doublon.analyseId ? `analyse #${doublon.analyseId}` : `proposition #${doublon.propositionId}`} (${doublon.critere}). Rien n'est relancé.`,
    );
  }

  // Fichiers temporaires, jamais commités (tmp/ est hors dépôt).
  mkdirSync(sortie, { recursive: true });
  const etape1 = path.join(sortie, "etape1.json");
  const fichierCommentaires = path.join(sortie, "commentaires.json");
  const fichierResultat = path.join(sortie, "resultat.json");
  writeFileSync(etape1, json(ficheRelue));
  writeFileSync(fichierCommentaires, json(commentairesPourModele(commentaires)));

  const args = [
    "scripts/analyze.js", etape1,
    "--candidat", candidat, "--theme", theme, "--source", source,
    "--auto", "--seuil-score", "0",
    "--revision", slug,
    "--resultat", fichierResultat,
    ...(commentaires.length ? ["--commentaires", fichierCommentaires] : []),
  ];
  log(`Étapes 2, 3 et 3 bis : candidat « ${candidat} », thème « ${theme} ».`);
  lancerAnalyze(args);
  if (!existsSync(fichierResultat)) throw new RevisionError("analyze.js n'a pas produit de résultat.");
  const resultat = JSON.parse(readFileSync(fichierResultat, "utf8"));
  if (!resultat.ecrit) throw new RevisionError(`analyze.js n'a rien écrit en base (${resultat.raison ?? "raison inconnue"}).`);
  log(`✓ Brouillon créé : analyse #${resultat.analyseId}, score ${resultat.score}/100.`);

  // Sorties des étapes 2 et 3, puis archive (construite par le code).
  const erreursEtape3 = erreursVersionSuivante(resultat.etape3);
  if (erreursEtape3.length) throw new RevisionError(`Sortie de l'étape 3 non conforme :\n- ${erreursEtape3.join("\n- ")}`);
  mkdirSync(path.join(root, path.dirname(sorties.etape3)), { recursive: true });
  writeFileSync(path.join(root, sorties.etape3), json(resultat.etape3));
  writeFileSync(path.join(root, sorties.mistral), json(resultat.etape2));

  const archive = construireArchive({
    date: dateParis(maintenant),
    versionSuivante: sorties.etape3,
    revision: resultat.revisionRelecture,
    commentaires,
  });
  const errArchive = verifierArchive(archive);
  if (errArchive) throw new RevisionError(`Bloc archive invalide : ${errArchive}`);
  writeFileSync(cheminFiche, json({ ...ficheRelue, relecture: { ...relecture, archive } }));
  const retenus = archive.reponses.filter((x) => x.retenu).length;
  log(`✓ Archive : ${archive.reponses.length} réponse(s), dont ${retenus} retenue(s).`);

  build();

  const fichiers = [`data/relectures/${slug}.json`, "public/relectures/index.html", sorties.etape3, sorties.mistral];
  writeFileSync(path.join(sortie, "fichiers.txt"), `${fichiers.join("\n")}\n`);
  const rapport = rapportMarkdown({ slug, relecture, notationAvant: ficheRelue.notation_detaillee, resultat, commentaires, theme, avertissements });
  writeFileSync(path.join(sortie, "rapport.md"), rapport);
  return { resultat, archive, fichiers, rapport };
}

// Simulation : la fiche relue (le bloc archive éventuel ne la modifie pas) et
// ses commentaires passent par les étapes 2 et 3 d'analyze.js --dry-run. Ni
// anti-doublon (la révision réelle serait trouvée), ni écriture hors <sortie>.
async function simuler(slug, { relecture, ficheRelue, sortie, lire, lancerAnalyze, log, confirmer }) {
  const candidat = String(relecture.candidat ?? "").trim();
  const { theme } = themeDuSite(relecture.theme);
  const { commentaires } = await lire(slug, candidat);
  if (!commentaires.length) throw new RevisionError("Aucun commentaire en base pour cette fiche : rien à simuler.");
  log(`Simulation de la révision « ${slug} » : ${commentaires.length} commentaire(s), étapes 2 et 3 seulement.`);

  const pourModele = commentairesPourModele(commentaires);
  const estimation = estimationCoutSimulation(
    JSON.stringify(ficheRelue, null, 2).length + JSON.stringify(pourModele, null, 2).length + CONSIGNES_ETAPE3_CARACTERES,
  );
  log(`Coût estimé : entre ~${estimation.min} $ et ~${estimation.max} $ (~${estimation.tokensEntree.toLocaleString("fr-FR")} tokens de prompt à l'étape 3, la recherche web fait varier l'entrée).`);
  if (!(await confirmer(estimation))) {
    log("Annulé : aucun appel payant.");
    return { annule: true, estimation };
  }

  mkdirSync(sortie, { recursive: true });
  const etape1 = path.join(sortie, "etape1.json");
  const fichierCommentaires = path.join(sortie, "commentaires.json");
  const fichierResultat = path.join(sortie, "resultat.json");
  writeFileSync(etape1, json(ficheRelue));
  writeFileSync(fichierCommentaires, json(pourModele));
  lancerAnalyze([
    "scripts/analyze.js", etape1,
    "--candidat", candidat, "--theme", theme, "--source", sourceDepuisRelecture(relecture),
    "--dry-run", "--resultat", fichierResultat, "--commentaires", fichierCommentaires,
  ]);
  if (!existsSync(fichierResultat)) throw new RevisionError("analyze.js n'a pas produit de résultat.");
  const resultat = JSON.parse(readFileSync(fichierResultat, "utf8"));

  const avertissements = erreursVersionSuivante(resultat.etape3).map((e) => `Sortie de l'étape 3 non conforme : ${e}`);
  const rapport = rapportMarkdown({ slug, relecture, notationAvant: ficheRelue.notation_detaillee, resultat, commentaires, theme, avertissements });
  writeFileSync(path.join(sortie, "rapport.md"), rapport);
  log(`\n${rapport}`);
  log(`Coût estimé de la simulation : ~${resultat.coutPipeline?.coutEstimeTotal ?? "?"} $. Rapport : ${path.join(sortie, "rapport.md")}`);
  return { resultat, rapport, estimation };
}

// ---------- CLI ----------

async function confirmerSimulation({ min, max }) {
  const { createInterface } = await import("node:readline/promises");
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return (await rl.question(`Lancer la simulation (appels payants, ~${min} à ~${max} $) ? Tapez « oui » : `)).trim().toLowerCase() === "oui";
  } finally {
    rl.close();
  }
}

function lancerAnalyzeReel(args) {
  const r = spawnSync(process.execPath, args, { cwd: ROOT, stdio: "inherit" });
  if (r.status !== 0) throw new RevisionError(`analyze.js a échoué (code ${r.status ?? r.error?.message}). Voir le journal ci-dessus.`);
}

function buildReel() {
  execFileSync(process.execPath, [path.join(ROOT, "scripts/build-relectures.js")], { cwd: ROOT, stdio: "inherit" });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { values, positionals } = parseArgs({
    options: { sortie: { type: "string" }, "dry-run": { type: "boolean", default: false } },
    allowPositionals: true,
  });
  const slug = positionals[0];
  if (!SLUG_PATTERN.test(String(slug))) {
    console.error(`✗ Slug invalide : « ${slug} ».\nUsage : node scripts/reviser-relecture.js <slug> [--dry-run] [--sortie <dossier>]`);
    process.exit(1);
  }
  const sortie = path.resolve(values.sortie ?? path.join(ROOT, "tmp", `revision-${slug}`));
  reviser(slug, {
    sortie,
    lancerAnalyze: lancerAnalyzeReel,
    build: buildReel,
    simulation: values["dry-run"],
    confirmer: confirmerSimulation,
  }).catch((e) => {
    const message = e instanceof RevisionError ? e.message : e?.stack ?? String(e);
    console.error(`✗ ${message}`);
    if (process.env.GITHUB_STEP_SUMMARY) {
      appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## ✗ Révision arrêtée\n\n\`\`\`text\n${message}\n\`\`\`\n`);
    }
    process.exit(1);
  });
}
