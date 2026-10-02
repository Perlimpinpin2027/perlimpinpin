import "dotenv/config";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { cleanContenu } from "./lib/clean-text.js";
import { genererVersionBasique } from "./analyze.js";

// Étape 3 bis en autonome : génère la version basique d'une fiche finale
// déjà produite, sans rien écrire en base (analyze.js est importé pour
// genererVersionBasique uniquement, aucune requête Prisma n'est lancée).
//
// Usage : node scripts/version-basique.js "<fiche finale .json>" [--sortie <dossier>]
// Par défaut, le résultat est écrit à côté du fichier source, en
// <nom>_basique.json.

function parseArgs(argv) {
  const positional = [];
  let sortie = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--sortie") sortie = argv[++i];
    else positional.push(argv[i]);
  }
  return { source: positional[0], sortie };
}

// Accepte une sortie d'étape 3 (fiche_complete + champs racine), fusionnée
// exactement comme dans runPipeline (analyze.js), ou un contenuComplet déjà
// fusionné. Une éventuelle version_basique existante est retirée avant
// génération : elle ne doit pas servir de référence au contrôle des chiffres.
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

async function main() {
  const { source, sortie } = parseArgs(process.argv.slice(2));

  if (!source) {
    console.error('Usage : node scripts/version-basique.js "<fiche finale .json>" [--sortie <dossier>]');
    process.exitCode = 1;
    return;
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY n'est pas défini (voir votre fichier .env).");
    process.exitCode = 1;
    return;
  }

  const ficheFinale = loadFicheFinale(JSON.parse(readFileSync(source, "utf-8")));
  if (!Array.isArray(ficheFinale.sources_utilisees)) {
    console.error(`${source} : sources_utilisees introuvable, ce fichier n'est pas une fiche finale.`);
    process.exitCode = 1;
    return;
  }

  console.log(`Étape 3 bis : version basique de ${basename(source)}…`);
  const { versionBasique, ancrages } = await genererVersionBasique(ficheFinale);

  // Le détail de l'erreur (nombres introuvables, schéma, API) vient d'être
  // affiché par genererVersionBasique.
  if (!versionBasique) {
    console.error("Échec de la génération, aucun fichier écrit.");
    process.exitCode = 1;
    return;
  }

  const dossier = sortie ?? dirname(source);
  mkdirSync(dossier, { recursive: true });
  const cible = join(dossier, `${basename(source).replace(/\.json$/i, "")}_basique.json`);
  // Les ancrages sont écrits ici pour la relecture ; ils ne vont jamais dans
  // contenuComplet (voir runPipeline, analyze.js).
  writeFileSync(cible, `${JSON.stringify({ version_basique: versionBasique, ancrages }, null, 2)}\n`, "utf-8");

  console.log(`✓ Écrit dans ${cible}`);
  console.log("");
  console.log("Sources principales retenues :");
  for (const index of versionBasique.sources_principales) {
    const entree = ficheFinale.sources_utilisees[index];
    console.log(`  [${index}] ${typeof entree === "string" ? entree : JSON.stringify(entree)}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
