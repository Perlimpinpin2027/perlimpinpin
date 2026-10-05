import { readFileSync, existsSync } from "node:fs";
import { saveAnalysis, genererVersionBasique, warnLongueursAccueil } from "./analyze.js";
import { cleanContenu } from "./lib/clean-text.js";
import { validateFicheCompleteStructure, checkNotationCoherence } from "./lib/scoring.js";

// Insère en base (statut "brouillon") une fiche dont l'étape 3 a été produite
// hors pipeline automatisé, à partir du JSON d'étape 3 et, si présent, du
// contrôle Mistral sauvegardé à côté. Même écriture que le pipeline
// (saveAnalysis), sans relancer les étapes 1 à 3. Publier ensuite avec
// scripts/publish.js --id <analyseId>.
//
// Comme runPipeline, l'étape 3 bis (version basique, seul appel à l'API
// Claude de ce script) est générée avant l'écriture : version_basique dans la
// fiche si elle réussit, ancrages dans auditArbitrage, et un échec ne bloque
// jamais l'import. --sans-version-basique saute cette étape ; --dry-run
// aussi (rien n'est écrit, donc rien n'est généré).

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) {
        args[argv[i].slice(2)] = true;
      } else {
        args[argv[i].slice(2)] = next;
        i++;
      }
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { etape3, mistral, candidat, theme, source } = args;

  if (!etape3 || !candidat || !theme || !source) {
    console.error(
      'Usage: node scripts/import-etape3.js --etape3 fiche_etape3.json [--mistral etape2_mistral.json] --candidat "Nom" --theme "Thème" --source "Texte de la proposition" [--sans-version-basique] [--dry-run]',
    );
    process.exitCode = 1;
    return;
  }

  const arbitrage3 = JSON.parse(readFileSync(etape3, "utf-8"));
  const etape2 = mistral && existsSync(mistral) ? JSON.parse(readFileSync(mistral, "utf-8")) : null;

  // Même assemblage que runPipeline() : les champs de rédaction finale à la
  // racine priment sur ceux de fiche_complete.
  const parsed = {
    ...arbitrage3.fiche_complete,
    titre_fiche: arbitrage3.titre_fiche,
    resume_court: arbitrage3.resume_court,
    teaser_accueil: arbitrage3.teaser_accueil,
    verdict_final: arbitrage3.verdict_final ?? arbitrage3.fiche_complete.verdict_final,
    verdict_conclusion: arbitrage3.verdict_conclusion,
  };

  const validation = validateFicheCompleteStructure(parsed);
  const coherence = checkNotationCoherence(parsed.notation_detaillee);
  if (!validation.valid || coherence.length > 0) {
    console.error("Fiche invalide, rien écrit :", validation.errors, coherence);
    process.exitCode = 1;
    return;
  }

  warnLongueursAccueil(parsed, "Étape 3");

  const pipelineResult = {
    parsed,
    contreAvisMistral: etape2?.contreAvisMistral ?? null,
    auditArbitrage: Array.isArray(arbitrage3.auditArbitrage) ? arbitrage3.auditArbitrage : [],
    coutPipeline: {
      tokensEtape2: etape2?.usage ?? null,
      tokensEtape3: null,
      note: "Étapes 1 et 3 produites hors pipeline automatisé ; tokens mesurés : étape 2 (Mistral) et étape 3 bis (version basique, si générée).",
    },
  };

  console.log(`Titre : ${parsed.titre_fiche}`);
  console.log(`Score : ${parsed.notation_detaillee.score_total}/100 (${parsed.notation_detaillee.appreciation})`);
  console.log(`Base  : ${new URL(process.env.DATABASE_URL).host}`);

  if (args["dry-run"]) {
    console.log("--dry-run : rien écrit, version basique non générée.");
    return;
  }

  if (args["sans-version-basique"]) {
    console.log("Étape 3 bis : sautée (--sans-version-basique).");
  } else if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("Étape 3 bis : sautée, ANTHROPIC_API_KEY n'est pas défini (voir votre fichier .env).");
  } else {
    // Fiche nettoyée comme dans runPipeline (cleanContenu) : la réponse du
    // modèle l'est aussi, ce qui garde la comparaison des extraits cohérente.
    // La fiche enregistrée, elle, reste celle de l'étape 3.
    // genererVersionBasique ne lève pas d'erreur sur un échec d'API ou de
    // validation ; le try/catch couvre le reste (prompt illisible…).
    try {
      const { versionBasique, ancrages, usage } = await genererVersionBasique(cleanContenu(parsed));
      pipelineResult.coutPipeline.tokensEtape3bis = usage;
      if (versionBasique) {
        parsed.version_basique = versionBasique;
        // Contrôle interne : dans auditArbitrage, jamais dans contenuComplet (public).
        pipelineResult.auditArbitrage.push({ type: "ancrages_version_basique", ancrages });
        console.log("Étape 3 bis : version basique… ✓");
      }
    } catch (error) {
      console.error(`  ⚠️  Étape 3 bis : échec (${error.message}), fiche importée SANS version basique.`);
    }
  }

  const saved = await saveAnalysis({ candidatNom: candidat, theme, source }, pipelineResult);
  console.log(`Candidat : ${saved.candidat.nom} (#${saved.candidat.id})`);
  console.log(`Proposition #${saved.proposition.id}, analyse #${saved.analyse.id} (statut : ${saved.analyse.statut})`);
  console.log(`Pour publier : node scripts/publish.js --id ${saved.analyse.id}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
