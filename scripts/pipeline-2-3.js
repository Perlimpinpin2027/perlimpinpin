import "dotenv/config";
import { pathToFileURL, fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { cleanContenu } from "./lib/clean-text.js";

// Script séparé et volontairement autonome (pas d'import depuis analyze.js) :
// l'étape 1 (recherche web) bouclait sans conclure une fois automatisée de
// bout en bout, donc elle reste faite à la main pour l'instant. Ce script
// n'automatise QUE les étapes 2 (Mistral) et 3 (arbitrage Claude), à partir
// du JSON d'étape 1 produit manuellement — voir prompt étape 1 dans
// data/prompt-methodologie.md pour le schéma exact attendu en entrée.

neonConfig.webSocketConstructor = ws;
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const __dirname = dirname(fileURLToPath(import.meta.url));

const FETCH_TIMEOUT_MS = 60_000;
const STREAM_INACTIVITY_TIMEOUT_MS = 60_000;

async function fetchWithTimeout(url, options, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(`Timeout : aucune réponse reçue après ${timeoutMs / 1000}s (${url}).`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

// --- Validation de l'entrée (JSON d'étape 1 produit à la main) -------------

// Reflète exactement le schéma FORMAT DE SORTIE du prompt étape 1 dans
// data/prompt-methodologie.md. Si ce prompt évolue, mettre à jour cette
// liste en conséquence.
// titre_court volontairement absent de cette liste : buildTitre() retombe
// proprement sur resume_court/mesure_reformulee s'il manque, et les JSON
// d'étape 1 produits manuellement ne le fournissent pas toujours.
const REQUIRED_ETAPE1_KEYS = [
  "mesure_reformulee",
  "nature_et_existant",
  "contexte_programme",
  "contexte_national",
  "contexte_international",
  "impact_environnement",
  "analyse_par_criteres",
  "analyse_longevites",
  "impact_temporel_et_sectoriel",
  "ce_qui_est_etabli",
  "ce_qui_est_probable",
  "ce_qui_est_discutable",
  "ce_qui_est_inconnu",
  "angles_morts",
  "notation_detaillee",
  "verdict_final",
  "sources_utilisees",
  "niveau_de_confiance",
  "limites",
  "resume_court",
  "phrase_teasing",
];

const REQUIRED_NOTATION_KEYS = [
  "factuel",
  "efficacite",
  "operationnel",
  "cout",
  "somme_4_criteres",
  "score_juridique_garde_fou",
  "veto_juridique_applique",
  "score_total",
  "appreciation",
];

// Calcule le score_total attendu selon la même formule que le prompt étape 1
// (INSTRUCTION DE CALCUL) : somme des 4 critères, plafonnée à 30 si le score
// juridique de garde-fou est < 25. Réutilisée en entrée (validateEtape1) et
// en sortie (vérification post-arbitrage).
function computeExpectedScore({ factuel, efficacite, operationnel, cout, score_juridique_garde_fou }) {
  const somme_4_criteres = factuel + efficacite + operationnel + cout;
  const score_total =
    score_juridique_garde_fou < 25 ? Math.min(somme_4_criteres, 30) : somme_4_criteres;
  return { somme_4_criteres, score_total };
}

function validateEtape1(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Le JSON d'étape 1 doit être un objet.");
  }

  const missing = REQUIRED_ETAPE1_KEYS.filter((key) => !(key in data));
  if (missing.length > 0) {
    throw new Error(
      `JSON d'étape 1 incomplet — clé(s) manquante(s) : ${missing.join(", ")}.`,
    );
  }

  const notation = data.notation_detaillee;
  if (!notation || typeof notation !== "object") {
    throw new Error("notation_detaillee doit être un objet.");
  }
  const missingNotation = REQUIRED_NOTATION_KEYS.filter((key) => !(key in notation));
  if (missingNotation.length > 0) {
    // Cas fréquent et plus utile à signaler explicitement : l'ancien schéma
    // (5 critères additionnés dont "juridique") plutôt qu'une simple liste
    // de clés manquantes.
    if ("juridique" in notation && !("score_juridique_garde_fou" in notation)) {
      throw new Error(
        "notation_detaillee semble utiliser l'ANCIEN schéma (5 critères additionnés, dont " +
          "\"juridique\") plutôt que le nouveau (4 critères + score_juridique_garde_fou séparé, " +
          "avec veto). Régénère le JSON d'étape 1 avec le prompt à jour dans data/prompt-methodologie.md.",
      );
    }
    throw new Error(
      `notation_detaillee incomplet — clé(s) manquante(s) : ${missingNotation.join(", ")}.`,
    );
  }

  // Revérifie l'INSTRUCTION DE CALCUL du prompt étape 1 (somme + veto). Ce
  // n'est qu'un garde-fou de diagnostic : on avertit mais on ne bloque pas,
  // l'étape 3 pourra de toute façon recalculer si besoin.
  const expected = computeExpectedScore(notation);
  if (expected.somme_4_criteres !== notation.somme_4_criteres) {
    console.warn(
      `⚠️  somme_4_criteres incohérente dans le JSON d'entrée : factuel+efficacite+operationnel+cout = ` +
        `${expected.somme_4_criteres}, mais somme_4_criteres = ${notation.somme_4_criteres}. On continue quand même.`,
    );
  }
  if (expected.score_total !== notation.score_total) {
    console.warn(
      `⚠️  score_total incohérent avec la règle de veto dans le JSON d'entrée : attendu ${expected.score_total} ` +
        `(score_juridique_garde_fou=${notation.score_juridique_garde_fou}), trouvé ${notation.score_total}. On continue quand même.`,
    );
  }
}

function loadEtape1(input) {
  // Deux modes d'entrée : chemin de fichier local, ou JSON collé directement
  // en argument (plus pratique pour un usage manuel répété).
  let raw;
  if (existsSync(input)) {
    raw = readFileSync(input, "utf-8");
  } else {
    raw = input;
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `Impossible de parser le JSON d'étape 1 (ni fichier valide, ni JSON valide en argument direct) : ${error.message}`,
    );
  }

  validateEtape1(data);
  return data;
}

// --- Étape 2 : contrôle qualité (Mistral) -----------------------------------

const MISTRAL_BASE_URL = "https://api.mistral.ai/v1";

const MISTRAL_SYSTEM_PROMPT = `Tu es un contrôleur qualité indépendant pour Perlimpinpin. Une première IA a produit l'analyse JSON ci-dessous sur une proposition politique. Tu ne dois PAS recommencer l'analyse ni proposer de nouveau score.

ANALYSE À CONTRÔLER :
{{reponse_etape_1}}

MISSION (par ordre de priorité) :
1. CHIFFRES ET SOURCES : un chiffre te semble-t-il faux, périmé, ou mal attribué ? Donne ta meilleure estimation alternative et ta confiance (haute/moyenne/faible).
2. QUALIFICATION JURIDIQUE : une affirmation sur la légalité/faisabilité constitutionnelle ou européenne te semble-t-elle erronée ou trop tranchée ? Ne confonds jamais faisabilité juridique et rapport de force politique conjoncturel (une majorité parlementaire actuelle contraire à une mesure n'est PAS un obstacle juridique). Vérifie aussi que le calcul du veto est cohérent : si score_juridique_garde_fou < 25, score_total doit être ≤ 30. Si ce n'est pas le cas, signale-le en priorité haute.
3. COHÉRENCE NOTE/TEXTE : chacune des 4 sous-notes (factuel, efficacite, operationnel, cout) reflète-t-elle vraiment la sévérité du texte écrit juste au-dessus ?
4. ANGLE MORT MAJEUR uniquement : un point structurant absent, pas un détail.
5. TENDANCE CENTRALE : les 4 sous-notes semblent-elles artificiellement regroupées autour du milieu de leur échelle (10-19 sur 25) sans que le texte au-dessus ne documente une incertitude réelle ? Si oui, signale-le en "categorie": "coherence_note".

Ne fais PAS de remarques sur le style, la longueur, ou des nuances mineures sans conséquence sur le score ou les faits. Si tu n'as aucune remarque sérieuse, ne force rien : mieux vaut une liste courte et solide qu'une liste longue et creuse.

Réponds en JSON strict, maximum 300 mots au total :
{
  "remarques": [
    {
      "categorie": "chiffre" | "juridique" | "coherence_note" | "angle_mort",
      "contenu": "...",
      "severite": "mineure" | "majeure",
      "confiance": "haute" | "moyenne" | "faible"
    }
  ],
  "avis_general": "solide" | "à nuancer" | "fragile"
}`;

// Étape 2 isolée dans sa propre fonction pour être facile à envelopper dans
// un try/catch côté appelant (résilience : un échec ici ne doit jamais
// bloquer l'étape 3).
async function callMistralQualityControl(etape1) {
  if (!process.env.MISTRAL_API_KEY) {
    throw new Error("MISTRAL_API_KEY n'est pas défini (voir votre fichier .env).");
  }

  const userMessage = MISTRAL_SYSTEM_PROMPT.replace(
    "{{reponse_etape_1}}",
    JSON.stringify(etape1, null, 2),
  );

  const response = await fetchWithTimeout(`${MISTRAL_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
    },
    body: JSON.stringify({
      model: "mistral-large-latest",
      messages: [{ role: "user", content: userMessage }],
      response_format: { type: "json_object" },
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    throw new Error(`Erreur API Mistral (${response.status}) : ${await response.text()}`);
  }

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content;
  if (!raw) {
    throw new Error("Réponse Mistral vide ou mal formée.");
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`JSON Mistral invalide : ${error.message}`);
  }

  return { parsed, usage: data.usage ?? {} };
}

// --- Étape 3 : arbitrage final (Claude) -------------------------------------

const ANTHROPIC_BASE_URL = "https://api.anthropic.com/v1";
const ANTHROPIC_HEADERS = {
  "Content-Type": "application/json",
  "x-api-key": process.env.ANTHROPIC_API_KEY,
  "anthropic-version": "2023-06-01",
};

function buildArbitrationPrompt(etape1, mistralResult) {
  const mistralSection = mistralResult
    ? JSON.stringify(mistralResult.parsed, null, 2)
    : "null";

  return `Voici ton analyse initiale et le contrôle qualité de Mistral.

TON ANALYSE INITIALE : ${JSON.stringify(etape1, null, 2)}
CONTRÔLE MISTRAL : ${mistralSection}

MISSION :
1. Pour chaque remarque de Mistral avec confiance "haute" ou "moyenne" : décide si elle est fondée. Si oui, intègre-la dans la section appropriée et ajuste la sous-note concernée si ça change vraiment l'évaluation. Ignore les remarques à confiance "faible" sauf si elles pointent un problème évident.
2. Si tu modifies une sous-note (factuel, efficacite, operationnel, cout) ou le score_juridique_garde_fou à la suite d'une remarque, recalcule intégralement somme_4_criteres, veto_juridique_applique et score_total selon l'INSTRUCTION DE CALCUL de l'étape 1 (somme_4_criteres = factuel+efficacite+operationnel+cout ; si score_juridique_garde_fou < 25 alors score_total = min(somme_4_criteres, 30), sinon score_total = somme_4_criteres). Ne jamais ajuster score_total "à l'instinct" — uniquement par ce recalcul.
3. Si CONTRÔLE MISTRAL est null/absent (Mistral indisponible), ignore les points 1 et 2 et conserve ton analyse initiale telle quelle.
4. Si aucune remarque de Mistral n'affecte le fond ou si le contrôle est null, recopie intégralement les champs du JSON de l'Étape 1 dans fiche_complete sans modifier leur texte.
5. Remplis le champ interne \`auditArbitrage\` (non public, suivi qualité interne) : pour chaque remarque de Mistral, précise si elle a été acceptée ou rejetée, et pourquoi en une phrase.
6. Ne mentionne JAMAIS, dans les champs destinés à la publication, l'existence d'un second modèle, d'un contrôle qualité, d'un arbitrage, d'un pipeline en plusieurs étapes, ou d'un document de travail interne. Le lecteur ne doit voir qu'une analyse journalistique autonome.
7. Ton humain, légèrement aéré, rigoureux, sans jargon, sans tirets cadratins.

Aucun outil n'est disponible pour ce tour (pas de recherche web, pas d'exécution de code) : n'essaie pas d'en invoquer un, même pour vérifier ou formatter le JSON. Ta réponse doit être uniquement du texte brut.

FORMAT DE SORTIE JSON STRICT, sans texte avant ni après, sans bloc de code, sans commentaire, sans appel d'outil :
{
  "auditArbitrage": [
    {"remarque": "...", "statut": "acceptee|rejetee", "raison": "..."}
  ],
  "fiche_complete": {
    /* tous les champs de l'analyse initiale, mis à jour après arbitrage, SAUF resume_court et phrase_teasing (remontés à la racine ci-dessous) */
  },
  "resume_court": "... (ton journalistique, phrase courte et accrocheuse, pas engagée ni partisane)",
  "teaser_accueil": "... (ton journalistique, deux phrases : résumé + question sur le réalisme, sans utiliser le mot 'réaliste'/'réalisme')"
}
La toute première caractère de ta réponse doit être "{" et le tout dernier "}".`;
}

// Pas de réutilisation de cache : l'étape 1 n'a pas été générée par un appel
// API dans ce run (elle a été produite à la main), donc il n'existe aucun
// préfixe déjà en cache côté Anthropic sur lequel s'appuyer ici.
async function arbitrate(etape1, mistralResult) {
  const messages = [{ role: "user", content: buildArbitrationPrompt(etape1, mistralResult) }];

  const response = await fetchWithTimeout(`${ANTHROPIC_BASE_URL}/messages`, {
    method: "POST",
    headers: ANTHROPIC_HEADERS,
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 32000,
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 1 }],
      tool_choice: { type: "none" },
      thinking: { type: "disabled" },
      messages,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Erreur API Anthropic, étape 3 (${response.status}) : ${errorBody}`);
  }

  return readStreamedMessage(response);
}

// --- Lecture du flux Anthropic (SSE) ----------------------------------------
// Copié à l'identique depuis analyze.js (voir ce fichier pour le
// raisonnement détaillé) — dupliqué volontairement pour que ce script reste
// autonome, plutôt que de dépendre des internes non exportés d'analyze.js.

function readWithInactivityTimeout(reader, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reader.cancel().catch(() => {});
      reject(new Error(`Timeout : flux Anthropic inactif depuis plus de ${timeoutMs / 1000}s.`));
    }, timeoutMs);

    reader
      .read()
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

function sanitizeContentBlocks(blocks) {
  return blocks.filter((block) => {
    if (!block) return false;
    if (block.type === "thinking") {
      return typeof block.thinking === "string" && block.thinking.length > 0;
    }
    if (block.type === "text") {
      return typeof block.text === "string" && block.text.length > 0;
    }
    return true;
  });
}

async function readStreamedMessage(response, { inactivityTimeoutMs = STREAM_INACTIVITY_TIMEOUT_MS } = {}) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const blocks = [];

  let message = { content: [], stop_reason: null, usage: {} };
  let buffer = "";

  while (true) {
    const { done, value } = await readWithInactivityTimeout(reader, inactivityTimeoutMs);
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

  message.content = sanitizeContentBlocks(blocks);
  return message;
}

// --- Extraction JSON défensive ---------------------------------------------
// Copié à l'identique depuis analyze.js (mêmes filets de secours).

function extractBalancedJsonSubstring(text) {
  const start = text.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function escapeControlCharsInJsonStrings(text) {
  let result = "";
  let inString = false;
  let escaped = false;

  for (const char of text) {
    if (inString) {
      if (escaped) {
        result += char;
        escaped = false;
      } else if (char === "\\") {
        result += char;
        escaped = true;
      } else if (char === '"') {
        result += char;
        inString = false;
      } else {
        const code = char.charCodeAt(0);
        if (code === 0x0a) result += "\\n";
        else if (code === 0x0d) result += "\\r";
        else if (code === 0x09) result += "\\t";
        else if (code < 0x20) result += `\\u${code.toString(16).padStart(4, "0")}`;
        else result += char;
      }
    } else {
      if (char === '"') inString = true;
      result += char;
    }
  }

  return result;
}

function extractJson(data, label) {
  const textBlocks = data.content.filter((block) => block.type === "text");
  if (textBlocks.length === 0) {
    const dumpPath = `./failed-${label}-${Date.now()}-no-text.json`;
    writeFileSync(
      dumpPath,
      JSON.stringify(
        {
          stop_reason: data.stop_reason,
          usage: data.usage,
          blockTypes: data.content.map((block) => block.type),
        },
        null,
        2,
      ),
      "utf-8",
    );
    console.error(`  ✗ Aucun bloc 'text' (${label}) — diagnostic sauvegardé dans ${dumpPath}`);
    throw new Error(`Aucun bloc 'text' trouvé dans la réponse de l'API (${label}).`);
  }

  const lastText = textBlocks[textBlocks.length - 1].text;
  const cleaned = lastText
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "");

  const attempts = [
    () => JSON.parse(cleaned),
    () => JSON.parse(escapeControlCharsInJsonStrings(cleaned)),
    () => JSON.parse(extractBalancedJsonSubstring(cleaned) ?? "throw"),
    () => JSON.parse(escapeControlCharsInJsonStrings(extractBalancedJsonSubstring(cleaned) ?? "throw")),
  ];

  let firstError;
  for (const [index, attempt] of attempts.entries()) {
    try {
      const parsed = attempt();
      if (index > 0) {
        console.error(`  … JSON récupéré via filet de secours (${label}).`);
      }
      return parsed;
    } catch (error) {
      if (index === 0) firstError = error;
    }
  }

  const dumpPath = `./failed-${label}-${Date.now()}.txt`;
  writeFileSync(dumpPath, lastText, "utf-8");
  console.error(`  ✗ JSON invalide (${label}) — réponse brute sauvegardée dans ${dumpPath}`);
  throw firstError;
}

// --- Coût -------------------------------------------------------------------

const PRICING = {
  claudeSonnet: { input: 3, cacheWrite: 3.75, cacheRead: 0.3, output: 15 },
  mistralLarge: { input: 2, output: 6 },
};

function estimateClaudeCost(usage = {}) {
  const {
    input_tokens = 0,
    cache_creation_input_tokens = 0,
    cache_read_input_tokens = 0,
    output_tokens = 0,
  } = usage;
  return (
    (input_tokens * PRICING.claudeSonnet.input +
      cache_creation_input_tokens * PRICING.claudeSonnet.cacheWrite +
      cache_read_input_tokens * PRICING.claudeSonnet.cacheRead +
      output_tokens * PRICING.claudeSonnet.output) /
    1_000_000
  );
}

function estimateMistralCost(usage) {
  if (!usage) return 0;
  const { prompt_tokens = 0, completion_tokens = 0 } = usage;
  return (
    (prompt_tokens * PRICING.mistralLarge.input + completion_tokens * PRICING.mistralLarge.output) /
    1_000_000
  );
}

function buildCoutPipeline({ usage2, usage3 }) {
  const coutEtape2 = estimateMistralCost(usage2);
  const coutEtape3 = estimateClaudeCost(usage3);

  return {
    tokensEtape1: null,
    tokensEtape2: usage2,
    tokensEtape3: usage3,
    coutEstimeParEtape: {
      etape2: Number(coutEtape2.toFixed(4)),
      etape3: Number(coutEtape3.toFixed(4)),
    },
    coutEstimeTotal: Number((coutEtape2 + coutEtape3).toFixed(4)),
    note: "tokensEtape1 non disponible : étape 1 réalisée manuellement",
  };
}

// --- Construction du titre / résumés d'accueil ------------------------------
// Copié à l'identique depuis analyze.js.

const TITRE_MAX_LENGTH = 80;
function truncateTitre(text) {
  if (text.length <= TITRE_MAX_LENGTH) return text;
  const truncated = text.slice(0, TITRE_MAX_LENGTH);
  const lastSpace = truncated.lastIndexOf(" ");
  const cut = lastSpace > 40 ? truncated.slice(0, lastSpace) : truncated;
  return `${cut.trimEnd()}…`;
}

function buildTitre(parsed) {
  if (typeof parsed.titre_court === "string" && parsed.titre_court.trim().length > 0) {
    return truncateTitre(parsed.titre_court.trim());
  }
  const candidates = [parsed.resume_court, parsed.mesure_reformulee].filter(
    (value) => typeof value === "string" && value.trim().length > 0,
  );
  if (candidates.length === 0) return null;
  const shortest = candidates.reduce((best, current) => (current.length < best.length ? current : best));
  return truncateTitre(shortest);
}

const RESUME_ACCUEIL_MAX_LENGTH = 250;
function truncateResumeAccueil(text) {
  if (text.length <= RESUME_ACCUEIL_MAX_LENGTH) return text;
  const truncated = text.slice(0, RESUME_ACCUEIL_MAX_LENGTH);
  const lastSentenceEnd = Math.max(
    truncated.lastIndexOf(". "),
    truncated.lastIndexOf("? "),
    truncated.lastIndexOf("! "),
  );
  if (lastSentenceEnd > 100) return truncated.slice(0, lastSentenceEnd + 1);
  const lastSpace = truncated.lastIndexOf(" ");
  const cut = lastSpace > 100 ? truncated.slice(0, lastSpace) : truncated;
  return `${cut.trimEnd()}…`;
}

function buildResumeAccueil(parsed) {
  if (typeof parsed.teaser_accueil === "string" && parsed.teaser_accueil.trim().length > 0) {
    return truncateResumeAccueil(parsed.teaser_accueil.trim());
  }
  return null;
}

const TEASER_MAX_LENGTH = 500;
function truncateTeaser(text) {
  if (text.length <= TEASER_MAX_LENGTH) return text;
  const truncated = text.slice(0, TEASER_MAX_LENGTH);
  const lastSentenceEnd = Math.max(
    truncated.lastIndexOf(". "),
    truncated.lastIndexOf("? "),
    truncated.lastIndexOf("! "),
  );
  if (lastSentenceEnd > 200) return truncated.slice(0, lastSentenceEnd + 1);
  const lastSpace = truncated.lastIndexOf(" ");
  const cut = lastSpace > 200 ? truncated.slice(0, lastSpace) : truncated;
  return `${cut.trimEnd()}…`;
}

function buildTeaser(parsed) {
  if (typeof parsed.resume_court === "string" && parsed.resume_court.trim().length > 0) {
    return truncateTeaser(parsed.resume_court.trim());
  }
  return null;
}

function toText(value) {
  if (Array.isArray(value)) {
    return value.map((item) => `• ${item}`).join("\n");
  }
  return value;
}

// --- Orchestration -----------------------------------------------------------

async function runPipeline23(etape1) {
  console.log("Étape 2/3 : contrôle qualité (Mistral)...");
  let mistralResult = null;
  try {
    mistralResult = await callMistralQualityControl(etape1);
    console.log(
      `  ✓ terminé (avis général : ${mistralResult.parsed.avis_general ?? "?"}, ${mistralResult.parsed.remarques?.length ?? 0} remarque(s))`,
    );
  } catch (error) {
    console.error(`  ✗ Mistral indisponible, pipeline poursuivi en mode dégradé : ${error.message}`);
  }

  console.log("Étape 3/3 : arbitrage final (Claude)...");
  const data3 = await arbitrate(etape1, mistralResult);
  const arbitrage3 = extractJson(data3, "etape3");

  const auditArbitrage = Array.isArray(arbitrage3.auditArbitrage) ? arbitrage3.auditArbitrage : [];
  const parsed3 = cleanContenu({
    ...(arbitrage3.fiche_complete ?? {}),
    resume_court: arbitrage3.resume_court,
    teaser_accueil: arbitrage3.teaser_accueil,
  });
  console.log(
    `  ✓ terminé (score final : ${parsed3.notation_detaillee?.score_total ?? "?"}/100)`,
  );

  console.log("Vérification post-arbitrage (recalcul du score côté code)...");
  const notationFinale = parsed3.notation_detaillee;
  if (notationFinale) {
    const expected = computeExpectedScore(notationFinale);
    const sommeOk = expected.somme_4_criteres === notationFinale.somme_4_criteres;
    const totalOk = expected.score_total === notationFinale.score_total;
    if (sommeOk && totalOk) {
      console.log("  ✓ score_total cohérent avec les sous-notes finales et la règle de veto.");
    } else {
      console.error("  ⚠️  INCOHÉRENCE DE CALCUL DÉTECTÉE dans la réponse de l'étape 3 :");
      if (!sommeOk) {
        console.error(
          `     somme_4_criteres : attendu ${expected.somme_4_criteres} ` +
            `(factuel=${notationFinale.factuel}+efficacite=${notationFinale.efficacite}+` +
            `operationnel=${notationFinale.operationnel}+cout=${notationFinale.cout}), ` +
            `trouvé ${notationFinale.somme_4_criteres}.`,
        );
      }
      if (!totalOk) {
        console.error(
          `     score_total : attendu ${expected.score_total} ` +
            `(score_juridique_garde_fou=${notationFinale.score_juridique_garde_fou}), ` +
            `trouvé ${notationFinale.score_total}.`,
        );
      }
      console.error("     Le résultat est écrit en base tel quel malgré cette incohérence — à vérifier manuellement.");
    }
  } else {
    console.error("  ⚠️  notation_detaillee absent de fiche_complete — impossible de vérifier le score.");
  }

  const coutPipeline = buildCoutPipeline({
    usage2: mistralResult?.usage ?? null,
    usage3: data3.usage ?? {},
  });

  return {
    parsed: parsed3,
    contreAvisMistral: mistralResult?.parsed ?? null,
    auditArbitrage,
    coutPipeline,
  };
}

async function saveAnalysis(item, pipelineResult) {
  const { parsed, contreAvisMistral, auditArbitrage, coutPipeline } = pipelineResult;
  const notation = parsed.notation_detaillee ?? {};
  const titre = buildTitre(parsed);
  const resumeAccueil = buildResumeAccueil(parsed);
  const teaser = buildTeaser(parsed);

  const candidat = await prisma.candidat.upsert({
    where: { nom: item.candidatNom },
    update: {},
    create: { nom: item.candidatNom, parti: "Non renseigné" },
  });

  const proposition = await prisma.proposition.create({
    data: {
      titre,
      texteOriginal: item.source,
      theme: item.theme,
      dateDeclaration: new Date(),
      candidatId: candidat.id,
    },
  });

  const analyse = await prisma.analyse.create({
    data: {
      propositionId: proposition.id,
      scoreFaisabilite: notation.score_total,
      // Barème v4 (4 critères /25 + garde-fou juridique séparé, non
      // additionné) : plus de correspondance directe avec les 5 colonnes
      // historiques /20-/25-/15 pensées pour l'ancien barème additif à 5
      // critères. On y range les valeurs les plus proches par sens ;
      // scorePertinence n'a plus d'équivalent (l'ancien 5e critère
      // "opérationnel" existe toujours mais le juridique n'est plus
      // additionné) — rangé à null. L'UI lit notation_detaillee dans
      // contenuComplet, pas ces colonnes.
      scoreSolidite: notation.factuel,
      scoreJuridique: notation.score_juridique_garde_fou,
      scoreOperationnel: notation.operationnel,
      scoreBudgetaire: notation.cout,
      scorePertinence: notation.efficacite,
      verdict: toText(parsed.verdict_final),
      resumeAccueil,
      teaser,
      cequiEstEtabli: toText(parsed.ce_qui_est_etabli),
      cequiEstProbable: toText(parsed.ce_qui_est_probable),
      cequiEstDiscutable: toText(parsed.ce_qui_est_discutable),
      cequiEstInconnu: toText(parsed.ce_qui_est_inconnu),
      sourcesUtilisees: toText(parsed.sources_utilisees),
      statut: "brouillon",
      versionMethodologie: "v4.0-garde-fou-juridique",
      contenuComplet: parsed,
      contreAvisMistral,
      auditArbitrage,
      coutPipeline,
    },
  });

  return { candidat, proposition, analyse };
}

function printCoutPipeline(coutPipeline) {
  console.log(`  Étape 2 (Mistral, contrôle) : ~$${coutPipeline.coutEstimeParEtape.etape2}`);
  if (coutPipeline.tokensEtape2) {
    console.log(`    prompt_tokens     : ${coutPipeline.tokensEtape2.prompt_tokens ?? "?"}`);
    console.log(`    completion_tokens : ${coutPipeline.tokensEtape2.completion_tokens ?? "?"}`);
  } else {
    console.log("    (Mistral indisponible, étape non exécutée)");
  }
  console.log(`  Étape 3 (Claude, arbitrage) : ~$${coutPipeline.coutEstimeParEtape.etape3}`);
  const u3 = coutPipeline.tokensEtape3 ?? {};
  console.log(`    input_tokens (non caché)      : ${u3.input_tokens ?? "?"}`);
  console.log(`    cache_creation_input_tokens   : ${u3.cache_creation_input_tokens ?? "?"}`);
  console.log(`    cache_read_input_tokens       : ${u3.cache_read_input_tokens ?? "?"}`);
  console.log(`    output_tokens                 : ${u3.output_tokens ?? "?"}`);
  console.log(`  Coût total estimé (étapes 2+3 seulement) : ~$${coutPipeline.coutEstimeTotal}`);
  console.log(`  Note : ${coutPipeline.note}`);
}

function parseArgs(argv) {
  const args = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      args[key] = argv[i + 1];
      i++;
    } else {
      positional.push(arg);
    }
  }
  return { args, positional };
}

async function main() {
  const { args, positional } = parseArgs(process.argv.slice(2));

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY n'est pas défini (voir votre fichier .env).");
    process.exitCode = 1;
    return;
  }
  if (!process.env.MISTRAL_API_KEY) {
    console.warn(
      "MISTRAL_API_KEY n'est pas défini : l'étape 2 (contrôle qualité) sera sautée, pipeline en mode dégradé.",
    );
  }

  const etape1Input = args.etape1 ?? positional[0];
  const { candidat: candidatNom, theme, source } = args;

  if (!etape1Input || !candidatNom || !theme || !source) {
    console.error(
      "Usage: node scripts/pipeline-2-3.js chemin/vers/analyse-etape1.json --candidat \"Nom\" --theme \"Thème\" --source \"Texte de la proposition\"\n" +
        "   ou: node scripts/pipeline-2-3.js --etape1 '{...JSON collé...}' --candidat \"Nom\" --theme \"Thème\" --source \"...\"",
    );
    process.exitCode = 1;
    return;
  }

  let etape1;
  try {
    etape1 = loadEtape1(etape1Input);
  } catch (error) {
    console.error(`✗ JSON d'étape 1 invalide : ${error.message}`);
    process.exitCode = 1;
    return;
  }
  console.log("✓ JSON d'étape 1 chargé et validé (toutes les clés attendues sont présentes).");
  console.log("");

  const item = { candidatNom, theme, source };
  const pipelineResult = await runPipeline23(etape1);
  const saved = await saveAnalysis(item, pipelineResult);

  console.log("");
  console.log(`Titre     : ${saved.proposition.titre}`);
  console.log(`Candidat  : ${saved.candidat.nom}`);
  console.log(`Thème     : ${theme}`);
  console.log(`Analyse   : #${saved.analyse.id} (statut: ${saved.analyse.statut})`);
  console.log(`Verdict   : ${saved.analyse.verdict}`);

  console.log("");
  console.log("Contre-avis Mistral (contreAvisMistral) :");
  console.log(
    pipelineResult.contreAvisMistral
      ? JSON.stringify(pipelineResult.contreAvisMistral, null, 2)
      : "  AUCUN — Mistral indisponible",
  );

  console.log("");
  console.log("Audit d'arbitrage, usage interne (auditArbitrage) :");
  console.log(
    pipelineResult.auditArbitrage.length > 0
      ? JSON.stringify(pipelineResult.auditArbitrage, null, 2)
      : "  (vide)",
  );

  console.log("");
  console.log("Coût du pipeline (coutPipeline) :");
  printCoutPipeline(pipelineResult.coutPipeline);
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
