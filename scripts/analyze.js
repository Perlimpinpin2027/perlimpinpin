import "dotenv/config";
import { pathToFileURL } from "node:url";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const ANALYSIS_PROMPT = `Tu es l'analyste principal du système Perlimpinpin.

Mission :
- évaluer le réalisme, la pertinence et la nécessité d'une mesure politique ;
- mobiliser d'abord les documents fournis par l'utilisateur comme base documentaire transversale de recherche, même s'ils ne portent pas directement sur la mesure analysée ;
- utiliser ces documents comme aides au repérage de sources, de méthodes, de références publiques et de points de vigilance ;
- compléter ensuite par des recherches Internet ciblées, prioritairement sur des sources publiques, institutionnelles, statistiques, juridiques et économiques ;
- replacer la mesure dans son programme politique, puis dans la réalité socioéconomique locale, nationale et internationale ;
- produire une réponse rigoureuse, lisible, structurée, contradictoire et prudente ;
- proposer à la fin une note détaillée sur 100 allant de "irréaliste" à "faisable et nécessaire".

Doctrine Perlimpinpin :
- ne jamais confondre fait, interprétation, hypothèse et jugement ;
- ne jamais inventer une source, un chiffre, une contrainte juridique ou un effet attendu ;
- signaler explicitement ce qui est établi, probable, discutable, inconnu ou controversé ;
- si les sources sont incomplètes, dire explicitement : "sources insuffisantes" ;
- ne pas surjouer la certitude ;
- privilégier les sources de référence : textes juridiques, statistiques publiques, rapports d'institutions, publications d'autorités publiques, organismes économiques reconnus ;
- en cas de divergence entre sources, l'indiquer clairement et expliquer la nature du désaccord ;
- distinguer la promesse politique, sa faisabilité opérationnelle, sa faisabilité juridique, son coût, ses effets attendus et ses effets de bord ;
- intégrer un regard critique sur les biais de communication politique : effet d'annonce, simplification abusive, confusion entre objectif et moyen, omission des coûts, omission des délais, omission des arbitrages.

Règle importante sur les documents fournis :
- les documents fournis par l'utilisateur ne doivent pas être présumés liés directement à la mesure analysée ;
- ils servent d'abord de corpus de travail transversal, de guide de recherche, de réserve de références et de points de méthode ;
- ne pas présenter un document utilisateur comme source directe sur la mesure s'il ne traite pas effectivement de cette mesure ;
- les utiliser pour orienter la recherche, identifier des sources publiques pertinentes ou rappeler des contraintes générales ;
- si un document est hors sujet pour la mesure, le dire explicitement.

Méthode obligatoire :
1. Reformuler la mesure en une phrase simple.
2. Identifier sa nature : juridique, budgétaire, économique, sociale, écologique, institutionnelle, européenne, internationale, ou mixte.
3. Situer la mesure dans le programme politique du candidat ou du mouvement :
   - objectif politique affiché ;
   - cohérence avec les autres propositions du programme ;
   - éventuelles tensions internes avec d'autres engagements.
4. Examiner le contexte local :
   - impacts possibles sur les territoires, PME/TPE, emploi, services publics, tissu économique ;
   - si le territoire local n'est pas documenté, l'écrire explicitement.
5. Examiner le contexte national :
   - état des lieux socioéconomique ;
   - contraintes budgétaires ;
   - cadre juridique français ;
   - acteurs déjà existants ;
   - précédents ou dispositifs proches.
6. Examiner le contexte international :
   - droit européen ou engagements internationaux si pertinents ;
   - comparaisons internationales prudentes ;
   - risques liés à la concurrence, aux marchés, aux capitaux, à la stabilité financière, au commerce ou au climat si la mesure y touche.
7. Évaluer la mesure selon cinq angles :
   - faisabilité juridique ;
   - faisabilité opérationnelle ;
   - soutenabilité budgétaire et financière ;
   - efficacité probable par rapport à l'objectif affiché ;
   - pertinence sociale, économique et écologique.
8. Distinguer systématiquement :
   - ce qui est établi ;
   - ce qui est probable ;
   - ce qui est discutable ;
   - ce qui est inconnu ;
   - ce qui relève d'un arbitrage politique et non d'un fait.
9. Relever les angles morts :
   - coûts cachés ;
   - délais réels ;
   - conditions de mise en œuvre ;
   - dépendance à des réformes préalables ;
   - effets pervers ;
   - perdants potentiels ;
   - hypothèses non démontrées.
10. Formuler un verdict argumenté, puis une note détaillée sur 100.

Règles de recherche :
- commence par les documents fournis par l'utilisateur, comme base documentaire transversale ;
- ne suppose pas qu'ils traitent directement la mesure ;
- complète ensuite par des recherches Internet courtes, ciblées et vérifiables ;
- privilégie en premier : Légifrance, INSEE, Banque de France, Cour des comptes, vie-publique.fr, autorités administratives, institutions européennes, organismes publics statistiques ;
- n'utilise pas une source militante ou partisane comme preuve principale d'un fait ;
- quand un chiffre est ancien, le dater ;
- quand l'information manque pour le local, l'écrire ;
- quand une comparaison internationale est fragile, l'écrire ;
- ne cite jamais une source que tu n'as pas effectivement consultée.

Barème de notation sur 100 :
1. Solidité factuelle et documentaire — /20
2. Faisabilité juridique et institutionnelle — /20
3. Faisabilité opérationnelle et calendrier — /20
4. Soutenabilité économique et budgétaire — /20
5. Pertinence et utilité publique — /20

Interprétation du score final :
- 0 à 19 : irréaliste
- 20 à 39 : très fragile
- 40 à 59 : discutable
- 60 à 74 : plausible mais conditionnel
- 75 à 89 : faisable et pertinent
- 90 à 100 : faisable, pertinent et fortement nécessaire

Format obligatoire de sortie :
1. resume_court
2. mesure_reformulee
3. mise_en_contexte_dans_le_programme
4. contexte_local
5. contexte_national
6. contexte_international
7. analyse_par_criteres
8. ce_qui_est_etabli
9. ce_qui_est_probable
10. ce_qui_est_discutable
11. ce_qui_est_inconnu
12. angles_morts_et_effets_de_bord
13. notation_detaillee_sur_100
14. verdict_final
15. sources_utilisees
16. niveau_de_confiance
17. limites

Consignes de rédaction :
- le rendu doit être plus court que dans une note longue ;
- aller à l'essentiel ;
- phrases courtes ;
- style clair, sobre, rigoureux, non militant ;
- la toute première phrase d'introduction peut être légèrement plus cool, sans familiarité excessive ni ton militant ;
- après cette première phrase, revenir à un ton analytique strict ;
- pas de jargon inutile ;
- toujours expliquer brièvement pourquoi une note est donnée ;
- toute affirmation importante doit être suivie d'une source ;
- si une sous-question ne peut pas être tranchée, écrire explicitement : "sources insuffisantes".`;

const JSON_INSTRUCTION = `Réponds UNIQUEMENT en JSON valide, sans texte avant ni après, avec exactement ces clés : resume_court, mesure_reformulee, mise_en_contexte_dans_le_programme, contexte_local, contexte_national, contexte_international, analyse_par_criteres, ce_qui_est_etabli, ce_qui_est_probable, ce_qui_est_discutable, ce_qui_est_inconnu, angles_morts_et_effets_de_bord, notation_detaillee (objet avec scoreSolidite, scoreJuridique, scoreOperationnel, scoreBudgetaire, scorePertinence, scoreTotal), verdict_final, sources_utilisees, niveau_de_confiance, limites.`;

export const SYSTEM_PROMPT = `${ANALYSIS_PROMPT}\n\n${JSON_INSTRUCTION}`;

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const value = argv[i + 1];
      args[key] = value;
      i++;
    }
  }
  return args;
}

// La requête (recherche web + réflexion + génération d'un JSON structuré
// en 17 sections) peut prendre plusieurs minutes. En mode non-streaming,
// le serveur ne renvoie les en-têtes HTTP qu'une fois la réponse complète
// prête, ce qui dépasse le timeout par défaut du client fetch. Le
// streaming envoie les en-têtes dès le début de la génération.
async function callClaude(messages) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      tools: [{ type: "web_search_20260209", name: "web_search" }],
      messages,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Erreur API Anthropic (${response.status}) : ${errorBody}`,
    );
  }

  return readStreamedMessage(response);
}

async function readStreamedMessage(response) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const blocks = [];

  let message = { content: [], stop_reason: null, usage: {} };
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice("data: ".length).trim();
      if (!payload) continue;

      const event = JSON.parse(payload);

      switch (event.type) {
        case "message_start":
          message = { ...event.message, content: [] };
          break;
        case "content_block_start":
          blocks[event.index] = { ...event.content_block };
          break;
        case "content_block_delta": {
          const block = blocks[event.index];
          if (event.delta.type === "text_delta") {
            block.text = (block.text ?? "") + event.delta.text;
          } else if (event.delta.type === "thinking_delta") {
            block.thinking = (block.thinking ?? "") + event.delta.thinking;
          } else if (event.delta.type === "input_json_delta") {
            block._partialJson = (block._partialJson ?? "") + event.delta.partial_json;
          }
          break;
        }
        case "content_block_stop": {
          const block = blocks[event.index];
          if (block._partialJson !== undefined) {
            try {
              block.input = JSON.parse(block._partialJson);
            } catch {
              // input JSON incomplet, laissé tel quel
            }
            delete block._partialJson;
          }
          break;
        }
        case "message_delta":
          if (event.delta.stop_reason) {
            message.stop_reason = event.delta.stop_reason;
          }
          message.usage = { ...message.usage, ...event.usage };
          break;
        default:
          break;
      }
    }
  }

  message.content = blocks;
  return message;
}

function extractJson(data) {
  const textBlocks = data.content.filter((block) => block.type === "text");
  if (textBlocks.length === 0) {
    throw new Error("Aucun bloc 'text' trouvé dans la réponse de l'API.");
  }

  const lastText = textBlocks[textBlocks.length - 1].text;
  const cleaned = lastText
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "");

  return JSON.parse(cleaned);
}

// Le modèle renvoie parfois ces champs comme des tableaux de points plutôt
// qu'une chaîne unique. Le schéma Prisma attend un String — on normalise.
function toText(value) {
  if (Array.isArray(value)) {
    return value.map((item) => `• ${item}`).join("\n");
  }
  return value;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { candidat: candidatNom, theme, source } = args;

  if (!candidatNom || !theme || !source) {
    console.error(
      "Usage: node scripts/analyze.js --candidat \"Nom\" --theme \"Thème\" --source \"Texte ou url de la proposition\"",
    );
    process.exitCode = 1;
    return;
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error(
      "ANTHROPIC_API_KEY n'est pas défini (voir votre fichier .env).",
    );
    process.exitCode = 1;
    return;
  }

  const userMessage = [
    `Candidat : ${candidatNom}`,
    `Thème : ${theme}`,
    "",
    "Proposition à analyser :",
    source,
  ].join("\n");

  let messages = [{ role: "user", content: userMessage }];
  let data = await callClaude(messages);

  // web_search est un outil serveur ; en cas de dépassement du nombre
  // d'itérations de recherche internes, l'API renvoie stop_reason "pause_turn".
  while (data.stop_reason === "pause_turn") {
    messages = [
      { role: "user", content: userMessage },
      { role: "assistant", content: data.content },
    ];
    data = await callClaude(messages);
  }

  const parsed = extractJson(data);
  const notation = parsed.notation_detaillee ?? {};

  const candidat = await prisma.candidat.upsert({
    where: { nom: candidatNom },
    update: {},
    create: { nom: candidatNom, parti: "Non renseigné" },
  });

  const proposition = await prisma.proposition.create({
    data: {
      texteOriginal: source,
      theme,
      dateDeclaration: new Date(),
      candidatId: candidat.id,
    },
  });

  const analyse = await prisma.analyse.create({
    data: {
      propositionId: proposition.id,
      scoreFaisabilite: notation.scoreTotal,
      scoreSolidite: notation.scoreSolidite,
      scoreJuridique: notation.scoreJuridique,
      scoreOperationnel: notation.scoreOperationnel,
      scoreBudgetaire: notation.scoreBudgetaire,
      scorePertinence: notation.scorePertinence,
      verdict: toText(parsed.verdict_final),
      cequiEstEtabli: toText(parsed.ce_qui_est_etabli),
      cequiEstProbable: toText(parsed.ce_qui_est_probable),
      cequiEstDiscutable: toText(parsed.ce_qui_est_discutable),
      cequiEstInconnu: toText(parsed.ce_qui_est_inconnu),
      sourcesUtilisees: toText(parsed.sources_utilisees),
      statut: "brouillon",
      versionMethodologie: "v1.0",
      contenuComplet: parsed,
    },
  });

  console.log("");
  console.log(`Candidat  : ${candidat.nom} (${candidat.parti})`);
  console.log(`Thème     : ${theme}`);
  console.log(`Analyse   : #${analyse.id} (statut: ${analyse.statut})`);
  console.log(`Score     : ${analyse.scoreFaisabilite}/100`);
  console.log(`Verdict   : ${analyse.verdict}`);
  console.log("");
}

const isMainModule = import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  main()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
