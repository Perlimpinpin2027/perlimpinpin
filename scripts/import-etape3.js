import { readFileSync, existsSync } from "node:fs";
import { saveAnalysis } from "./analyze.js";
import { validateFicheCompleteStructure, checkNotationCoherence } from "./lib/scoring.js";

// Insère en base (statut "brouillon") une fiche dont l'étape 3 a été produite
// hors pipeline automatisé, à partir du JSON d'étape 3 et, si présent, du
// contrôle Mistral sauvegardé à côté. Même écriture que le pipeline
// (saveAnalysis), sans rappeler aucune API. Publier ensuite avec
// scripts/publish.js --id <analyseId>.

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
      'Usage: node scripts/import-etape3.js --etape3 fiche_etape3.json [--mistral etape2_mistral.json] --candidat "Nom" --theme "Thème" --source "Texte de la proposition" [--dry-run]',
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

  const pipelineResult = {
    parsed,
    contreAvisMistral: etape2?.contreAvisMistral ?? null,
    auditArbitrage: Array.isArray(arbitrage3.auditArbitrage) ? arbitrage3.auditArbitrage : [],
    coutPipeline: {
      tokensEtape2: etape2?.usage ?? null,
      tokensEtape3: null,
      note: "Étapes 1 et 3 produites hors pipeline automatisé ; seule l'étape 2 (Mistral) a consommé des tokens mesurés.",
    },
  };

  console.log(`Titre : ${parsed.titre_fiche}`);
  console.log(`Score : ${parsed.notation_detaillee.score_total}/100 (${parsed.notation_detaillee.appreciation})`);
  console.log(`Base  : ${new URL(process.env.DATABASE_URL).host}`);

  if (args["dry-run"]) {
    console.log("--dry-run : rien écrit.");
    return;
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
