// Ajoute une version basique (étape 3 bis, produite à part, par exemple par
// scripts/version-basique.js puis corrigée à la main) à une fiche déjà en base
// au statut « brouillon » (visible sur /test).
//
//   node scripts/ajouter-version-basique.js --fiche <etape3.json> --basique <basique.json> [--id N]
//       → simulation (par défaut) : retrouve le brouillon, refait les contrôles
//         de version-basique.js (schéma, nombres, ancrages mot pour mot) contre
//         le fichier d'étape 3 ET contre le contenu en base, affiche ce qui
//         changerait. N'écrit RIEN.
//   … --sauvegarde
//       → idem, et écrit la ligne actuelle (contenuComplet, auditArbitrage,
//         statut) dans logs/sauvegardes/. N'écrit RIEN en base.
//   … --appliquer
//       → sauvegarde, puis demande « oui », puis écrit.
//
// Écriture ciblée : contenuComplet.version_basique (ajoutée ou remplacée) et,
// dans auditArbitrage, l'entrée { type: "ancrages_version_basique" } (ajoutée
// ou remplacée), exactement comme runPipeline (scripts/analyze.js). Aucune
// autre clé, aucun score, aucun statut ne change. Refuse une fiche publiée.
// Le script utilise DATABASE_URL (.env, donc la production, sauf si
// DATABASE_URL est définie dans le terminal).
import "dotenv/config";
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { cleanContenu } from "./lib/clean-text.js";
import { confirmerEcriture, hoteDe } from "./lib/garde-fou-base.js";
import { checkAncragesVersionBasique, checkChiffresVersionBasique, validateVersionBasique } from "./lib/scoring.js";

neonConfig.webSocketConstructor = ws;

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SAUVEGARDES_PATH = join(ROOT, "logs", "sauvegardes");
const INSERTIONS_LOG_PATH = join(ROOT, "logs", "insertions.jsonl");
const USAGE =
  "Usage : node scripts/ajouter-version-basique.js --fiche <etape3.json> --basique <basique.json> [--id N] [--sauvegarde | --appliquer]";

function fail(message) {
  console.error(`Erreur : ${message}`);
  process.exit(1);
}

// Même chargement que loadFicheFinale (scripts/version-basique.js).
function loadFicheFinale(raw) {
  if (raw.fiche_complete) {
    const fiche = raw.fiche_complete;
    return cleanContenu({
      ...fiche,
      titre_fiche: raw.titre_fiche,
      resume_court: raw.resume_court,
      teaser_accueil: raw.teaser_accueil,
      verdict_final: raw.verdict_final ?? fiche.verdict_final,
      verdict_conclusion: raw.verdict_conclusion,
    });
  }
  const { version_basique: _ancienne, ...fiche } = raw;
  return cleanContenu(fiche);
}

// Mêmes contrôles que genererVersionBasique (scripts/analyze.js). Renvoie la
// liste des erreurs (vide si tout passe).
function controler(versionBasique, ancrages, ficheFinale) {
  const validation = validateVersionBasique(versionBasique, ficheFinale.sources_utilisees);
  if (!validation.valid) return validation.errors;
  return [
    ...checkChiffresVersionBasique(validation.versionBasique, ficheFinale).map(
      (nombre) => `Le nombre « ${nombre} » n'apparaît pas dans la fiche finale.`,
    ),
    ...checkAncragesVersionBasique(ancrages, validation.versionBasique, ficheFinale),
  ];
}

const { values } = parseArgs({
  options: {
    fiche: { type: "string" },
    basique: { type: "string" },
    id: { type: "string" },
    sauvegarde: { type: "boolean", default: false },
    appliquer: { type: "boolean", default: false },
  },
});
if (!values.fiche || !values.basique) fail(USAGE);

const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }) });

async function main() {
  const host = hoteDe(process.env.DATABASE_URL);
  console.log(`Base ciblée : ${host}\n`);

  const ficheFichier = loadFicheFinale(JSON.parse(readFileSync(values.fiche, "utf-8")));
  // Réponse nettoyée comme dans genererVersionBasique.
  const basique = cleanContenu(JSON.parse(readFileSync(values.basique, "utf-8")));
  const { version_basique: versionBasique, ancrages } = basique;

  const erreursFichier = controler(versionBasique, ancrages, ficheFichier);
  console.log(`Contrôle contre ${values.fiche} : ${erreursFichier.length === 0 ? "OK" : "ÉCHEC"}`);
  console.log(`  ${ancrages?.length ?? 0} ancrage(s), sources principales ${JSON.stringify(versionBasique?.sources_principales)}`);
  erreursFichier.forEach((e) => console.log(`  - ${e}`));
  if (erreursFichier.length > 0) fail("version basique refusée, rien n'est modifié.");

  // Le brouillon : par --id, sinon par titre_fiche identique à celui du fichier.
  let analyse;
  if (values.id) {
    analyse = await prisma.analyse.findUnique({
      where: { id: Number(values.id) },
      include: { proposition: { include: { candidat: true } } },
    });
    if (!analyse) fail(`analyse #${values.id} introuvable.`);
  } else {
    const candidates = (
      await prisma.analyse.findMany({ include: { proposition: { include: { candidat: true } } } })
    ).filter((a) => a.contenuComplet?.titre_fiche === ficheFichier.titre_fiche);
    if (candidates.length !== 1) {
      candidates.forEach((a) => console.log(`  #${a.id} ${a.proposition.candidat.nom} (${a.statut})`));
      fail(`${candidates.length} analyse(s) portent le titre « ${ficheFichier.titre_fiche} » : précisez --id.`);
    }
    analyse = candidates[0];
  }

  const contenu = analyse.contenuComplet;
  console.log(`\nAnalyse #${analyse.id}, ${analyse.proposition.candidat.nom}, statut : ${analyse.statut}`);
  console.log(`  Titre en base : ${contenu?.titre_fiche}`);
  console.log(`  Score : ${contenu?.notation_detaillee?.score_total}/100`);
  if (analyse.statut !== "brouillon") fail("cette fiche n'est pas un brouillon, rien n'est modifié.");

  // Le brouillon a pu être retouché sur /test : les extraits doivent aussi
  // figurer dans le contenu réellement en base.
  const { version_basique: ancienne, ...contenuSansBasique } = contenu;
  const erreursBase = controler(versionBasique, ancrages, cleanContenu(contenuSansBasique));
  console.log(`\nContrôle contre le contenu en base : ${erreursBase.length === 0 ? "OK" : "ÉCHEC"}`);
  erreursBase.forEach((e) => console.log(`  - ${e}`));
  if (erreursBase.length > 0) fail("le brouillon en base diffère du fichier d'étape 3, rien n'est modifié.");

  const audit = Array.isArray(analyse.auditArbitrage) ? analyse.auditArbitrage : [];
  const ancienAncrage = audit.some((entree) => entree?.type === "ancrages_version_basique");
  const nouveauContenu = { ...contenu, version_basique: validateVersionBasique(versionBasique, ficheFichier.sources_utilisees).versionBasique };
  const nouvelAudit = [
    ...audit.filter((entree) => entree?.type !== "ancrages_version_basique"),
    { type: "ancrages_version_basique", ancrages },
  ];

  console.log("\nChangements :");
  console.log(`  contenuComplet.version_basique : ${ancienne ? "REMPLACÉE" : "ajoutée"}`);
  console.log(`  auditArbitrage (ancrages_version_basique) : ${ancienAncrage ? "REMPLACÉ" : "ajouté"}`);
  console.log(`  Résumé : ${nouveauContenu.version_basique.resume.slice(0, 160)}…`);

  if (!values.sauvegarde && !values.appliquer) {
    console.log("\nSimulation : rien n'a été écrit. Relancez avec --sauvegarde, puis --appliquer.");
    return;
  }

  mkdirSync(SAUVEGARDES_PATH, { recursive: true });
  const horodatage = new Date().toISOString().replace(/[:.]/g, "-");
  const cible = join(SAUVEGARDES_PATH, `analyse-${analyse.id}-avant-version-basique-${horodatage}.json`);
  writeFileSync(
    cible,
    `${JSON.stringify(
      { base: host, analyseId: analyse.id, statut: analyse.statut, contenuComplet: contenu, auditArbitrage: analyse.auditArbitrage },
      null,
      2,
    )}\n`,
    "utf-8",
  );
  console.log(`\n✓ Sauvegarde : ${cible}`);

  if (!values.appliquer) {
    console.log("Rien n'a été écrit en base. Relancez avec --appliquer pour écrire.");
    return;
  }

  const ok = await confirmerEcriture({
    host,
    question: `Ajouter la version basique au brouillon #${analyse.id} ?`,
  });
  if (!ok) {
    console.log("Annulé, rien n'a été modifié.");
    return;
  }

  await prisma.analyse.update({
    where: { id: analyse.id },
    data: { contenuComplet: nouveauContenu, auditArbitrage: nouvelAudit },
  });
  mkdirSync(dirname(INSERTIONS_LOG_PATH), { recursive: true });
  appendFileSync(
    INSERTIONS_LOG_PATH,
    `${JSON.stringify({ date: new Date().toISOString(), base: host, script: "ajouter-version-basique", analyseId: analyse.id, sauvegarde: cible })}\n`,
  );
  console.log(`\n✓ Version basique ajoutée au brouillon #${analyse.id} (visible sur /test/${analyse.id}).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
