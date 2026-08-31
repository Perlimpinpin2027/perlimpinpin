import "dotenv/config";
import { pathToFileURL, fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { writeFileSync, readFileSync, existsSync, statSync } from "node:fs";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { cleanContenu } from "./lib/clean-text.js";
import {
  validateEtape1Structure,
  validateFicheCompleteStructure,
  checkNotationCoherence,
} from "./lib/scoring.js";

neonConfig.webSocketConstructor = ws;

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- Garde-fous réseau -------------------------------------------------------
// Un appel réseau qui ne répond jamais (ni en-têtes, ni octet) bloquerait le
// pipeline indéfiniment. Ces deux délais échouent proprement à la place,
// sans limiter la durée totale d'une génération légitime (qui peut prendre
// plusieurs minutes) : FETCH_TIMEOUT_MS ne couvre que l'attente de la toute
// première réponse, STREAM_INACTIVITY_TIMEOUT_MS ne couvre que les trous de
// silence pendant la lecture d'un flux SSE déjà démarré (réinitialisé à
// chaque chunk reçu).
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

// --- data/prompt-methodologie.md : source unique pour les étapes 2 et 3 ----
// Ce fichier réunit dans UN SEUL document les prompts des étapes 1 (Claude,
// système — reste produite manuellement, hors pipeline automatisé), 2
// (Mistral) et 3 (Claude, arbitrage + rédaction), délimités par des
// séparateurs "================...\nÉTAPE N : ...\n================...".
// Seules les étapes 2 et 3 sont extraites et utilisées ici : l'étape 1 reste
// volontairement hors de ce module (voir loadEtape1() plus bas, qui lit un
// JSON déjà produit ailleurs). Extraire à la volée plutôt que dupliquer en
// dur dans le code garantit qu'il n'existe qu'une seule version de chaque
// prompt (voir l'intention explicite du fichier : "que le prompt utilisé
// manuellement et celui utilisé automatiquement soient garantis identiques").
const SECTION_BAR = "================================================================================";

// Extrait le texte entre deux ancres littérales (la première ancre exclue,
// jusqu'à la seconde exclue, ou jusqu'à la fin si aucune n'est fournie).
function extractSection(fullText, startAnchor, endAnchor) {
  const startIndex = fullText.indexOf(startAnchor);
  if (startIndex === -1) {
    throw new Error(`data/prompt-methodologie.md : ancre de début introuvable : ${JSON.stringify(startAnchor)}`);
  }
  const contentStart = startIndex + startAnchor.length;
  const endIndex = endAnchor ? fullText.indexOf(endAnchor, contentStart) : -1;
  if (endAnchor && endIndex === -1) {
    throw new Error(`data/prompt-methodologie.md : ancre de fin introuvable : ${JSON.stringify(endAnchor)}`);
  }
  return fullText.slice(contentStart, endIndex === -1 ? undefined : endIndex).trim();
}

// Extrait le contenu d'une étape délimitée par "====...\nÉTAPE N : ...\n====...",
// depuis la fin de sa propre ligne de séparateurs jusqu'à l'ancre suivante.
function extractStageContent(fullText, headerLabel, nextAnchor) {
  const headerIndex = fullText.indexOf(headerLabel);
  if (headerIndex === -1) {
    throw new Error(`data/prompt-methodologie.md : en-tête introuvable : ${JSON.stringify(headerLabel)}`);
  }
  const closingBarIndex = fullText.indexOf(SECTION_BAR, headerIndex + headerLabel.length);
  if (closingBarIndex === -1) {
    throw new Error(`data/prompt-methodologie.md : barre de fermeture introuvable après ${JSON.stringify(headerLabel)}`);
  }
  return extractSection(fullText, fullText.slice(0, closingBarIndex + SECTION_BAR.length), nextAnchor);
}

const PROMPT_METHODOLOGIE_PATH = join(__dirname, "..", "data", "prompt-methodologie.md");

function loadMethodologieSections() {
  const fullText = readFileSync(PROMPT_METHODOLOGIE_PATH, "utf-8");

  const etape2Template = extractStageContent(fullText, "ÉTAPE 2 :", `\n\n${SECTION_BAR}\nÉTAPE 3 :`);

  const etape3Template = extractStageContent(fullText, "ÉTAPE 3 :", "\n\n---\n\n# POINTS TECHNIQUES");

  return { etape2Template, etape3Template };
}

// Filet de sécurité d'audit (jamais affiché) : capture la date de dernière
// modification du fichier de prompt au moment de la génération, pour
// pouvoir repérer après coup une analyse produite après un changement de
// prompt dont versionMethodologie n'aurait pas été remonté à la main — voir
// Analyse.promptFileModifiedAt (prisma/schema.prisma).
function getPromptFileModifiedAt() {
  return statSync(PROMPT_METHODOLOGIE_PATH).mtime;
}

const { etape2Template: MISTRAL_TEMPLATE, etape3Template: ARBITRAGE_TEMPLATE } = loadMethodologieSections();

function fillTemplate(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => (key in vars ? String(vars[key]) : match));
}
// L'étape 1 (recherche + analyse) reste produite manuellement, hors de ce
// module — voir loadEtape1() plus bas. Il ne reste donc plus, ici, que
// l'infrastructure partagée par les étapes 2 et 3 (Anthropic pour l'étape 3
// et la réparation structurelle, Mistral pour l'étape 2).
const ANTHROPIC_BASE_URL = "https://api.anthropic.com/v1";
const ANTHROPIC_HEADERS = {
  "Content-Type": "application/json",
  "x-api-key": process.env.ANTHROPIC_API_KEY,
  "anthropic-version": "2023-06-01",
};

// Course entre reader.read() et un minuteur d'inactivité : réinitialisé à
// chaque chunk reçu (voir la boucle plus bas), donc n'interrompt jamais un
// flux long mais actif, seulement un flux qui s'arrête de répondre.
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

// Un pause_turn (limite d'itérations du tool serveur atteinte) peut couper
// le flux en plein milieu d'un bloc, ex. un bloc "thinking" tout juste
// démarré, sans texte. Renvoyer un tel bloc incomplet dans le tour suivant
// fait échouer la validation de l'API ("each thinking block must contain
// thinking"). On retire les blocs visiblement incomplets avant de
// reconstruire l'historique de conversation.
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
  // Compteur affiché en direct, pour donner une visibilité sur la
  // progression d'un flux long (plusieurs minutes) : combien de recherches
  // web ont été lancées jusqu'ici, et à quoi elles correspondent.
  let searchCount = 0;

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
          if (block.type === "server_tool_use" && block.name === "web_search") {
            searchCount++;
            console.log(`  🔎 Recherche web #${searchCount} : "${block.input?.query ?? "?"}"`);
          } else if (block.type === "web_search_tool_result") {
            const resultCount = Array.isArray(block.content) ? block.content.length : "?";
            console.log(`    ↳ ${resultCount} résultat(s) reçu(s)`);
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

// Filet de secours si le modèle enrobe malgré tout le JSON (bloc de code,
// tentative d'appel d'outil halluciné, commentaire...) : cherche le plus
// grand objet JSON à accolades équilibrées dans le texte et tente de le
// parser isolément, plutôt que d'échouer sur le texte brut en entier.
// Cherche le plus GRAND objet JSON à accolades équilibrées dans le texte —
// pas le premier trouvé. Si le modèle a laissé un petit fragment entre
// accolades avant la vraie réponse (une citation, un aparté, "{environ 8
// milliards}"...), s'arrêter au premier "{" récupérerait ce fragment au
// lieu de l'analyse complète qui suit.
function extractBalancedJsonSubstring(text) {
  let best = null;

  for (let start = 0; start < text.length; start++) {
    if (text[start] !== "{") continue;

    let depth = 0;
    for (let i = start; i < text.length; i++) {
      if (text[i] === "{") depth++;
      else if (text[i] === "}") {
        depth--;
        if (depth === 0) {
          const candidate = text.slice(start, i + 1);
          if (!best || candidate.length > best.length) best = candidate;
          break;
        }
      }
    }
  }

  return best;
}

// Le modèle échappe parfois mal les longs champs texte : un saut de ligne
// littéral (ou une tabulation) laissé tel quel à l'intérieur d'une valeur
// JSON casse JSON.parse ("Bad control character in string literal"), alors
// que le reste du document est bien formé. On ré-échappe uniquement les
// caractères de contrôle trouvés À L'INTÉRIEUR d'une chaîne (en suivant les
// guillemets non échappés), sans toucher au formatage en dehors des chaînes.
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

function extractJson(data) {
  const textBlocks = data.content.filter((block) => block.type === "text");
  if (textBlocks.length === 0) {
    // Aucun texte à dumper, mais stop_reason/usage/thinking sont le seul
    // moyen de comprendre pourquoi (ex. max_tokens atteint pendant la
    // réflexion, avant tout texte final) — sans ce dump, cette information
    // disparaît avec le process au moment du throw.
    const dumpPath = `./failed-analysis-${Date.now()}-no-text.json`;
    writeFileSync(
      dumpPath,
      JSON.stringify(
        {
          stop_reason: data.stop_reason,
          usage: data.usage,
          blockTypes: data.content.map((block) => block.type),
          thinking: data.content
            .filter((block) => block.type === "thinking")
            .map((block) => block.thinking),
        },
        null,
        2,
      ),
      "utf-8",
    );
    console.error(`Aucun bloc 'text' — diagnostic sauvegardé dans ${dumpPath}`);
    throw new Error("Aucun bloc 'text' trouvé dans la réponse de l'API.");
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
        // Toujours garder une trace du texte brut quand un filet de
        // secours a dû intervenir : un objet plus petit que prévu (champs
        // manquants) reste possible même après extraction/échappement, et
        // sans ce dump il n'y a ensuite aucun moyen de vérifier si le bon
        // objet a été récupéré.
        const dumpPath = `./recovered-analysis-${Date.now()}.txt`;
        writeFileSync(dumpPath, lastText, "utf-8");
        console.error(
          `JSON récupéré via filet de secours (tentative ${index + 1}/${attempts.length}) — texte brut sauvegardé dans ${dumpPath} pour vérification.`,
        );
      }
      return parsed;
    } catch (error) {
      if (index === 0) firstError = error;
    }
  }

  // On vient de payer cet appel — on sauvegarde la sortie brute plutôt que
  // de la perdre, pour pouvoir la récupérer/inspecter manuellement. On
  // sauvegarde aussi les blocs "thinking" à part : ils ne font jamais partie
  // du texte final, mais peuvent révéler à quel moment le raisonnement du
  // modèle a dévié de ce qu'il a réellement fait (ex. tool_use/tool_result
  // reçus mais ignorés dans le raisonnement qui suit).
  const dumpPath = `./failed-analysis-${Date.now()}.txt`;
  writeFileSync(dumpPath, lastText, "utf-8");
  console.error(`JSON invalide — réponse brute sauvegardée dans ${dumpPath}`);

  const thinkingBlocks = data.content.filter((block) => block.type === "thinking");
  if (thinkingBlocks.length > 0) {
    const thinkingDumpPath = dumpPath.replace(/\.txt$/, "-thinking.txt");
    writeFileSync(
      thinkingDumpPath,
      thinkingBlocks
        .map((block, index) => `--- Bloc thinking #${index + 1} ---\n${block.thinking}`)
        .join("\n\n"),
      "utf-8",
    );
    console.error(`Blocs de réflexion sauvegardés dans ${thinkingDumpPath}`);
  }

  throw firstError;
}

// --- Réparation structurelle -------------------------------------------------
// Une réponse dont la structure ne respecte pas le schéma attendu (mauvais
// type, énumération invalide, note hors bornes...) n'est jamais corrigée
// silencieusement : une seule tentative de réparation est demandée au
// modèle, sur le JSON déjà produit, en lui interdisant de changer le fond.
// Si la deuxième tentative échoue aussi, l'étape est considérée en échec.
// Ne concerne QUE la structure (types/bornes/énumérations) — jamais
// l'arithmétique de notation_detaillee, jamais recalculée ni corrigée ici
// (voir scripts/lib/scoring.js, en-tête : "le calcul final reste effectué
// par les IA").
async function repairJsonStructure(invalidJson, errors, label) {
  const instruction = `Le JSON suivant devait respecter strictement un schéma précis mais contient des erreurs de structure. NE MODIFIE AUCUNE conclusion, note, ou texte analytique, SAUF si l'erreur ci-dessous t'y oblige explicitement.

ERREURS DÉTECTÉES :
${errors.map((error) => `- ${error}`).join("\n")}

JSON À CORRIGER :
${JSON.stringify(invalidJson, null, 2)}

Retourne uniquement le JSON corrigé, structuré exactement comme l'original (mêmes clés, même forme), sans texte avant ni après, sans bloc de code.`;

  const response = await fetchWithTimeout(`${ANTHROPIC_BASE_URL}/messages`, {
    method: "POST",
    headers: ANTHROPIC_HEADERS,
    body: JSON.stringify({
      model: "claude-sonnet-5",
      // 16000 : un JSON d'étape 1 ou de fiche_complete riche (recherches,
      // sources, 4-5 critères détaillés) peut dépasser largement 8000
      // tokens en sortie — une limite trop basse tronque la réparation en
      // plein milieu d'une chaîne, provoquant un échec de parsing plutôt
      // qu'une réparation.
      max_tokens: 16000,
      thinking: { type: "disabled" },
      messages: [{ role: "user", content: instruction }],
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Erreur API Anthropic, réparation JSON (${label}) (${response.status}) : ${errorBody}`);
  }

  return readStreamedMessage(response);
}

// Avertit sans jamais bloquer ni corriger : voir scripts/lib/scoring.js,
// checkNotationCoherence (le calcul final reste la responsabilité du modèle).
function warnNotationCoherence(notation, label) {
  const errors = checkNotationCoherence(notation);
  if (errors.length === 0) return;
  console.error(`  ⚠️  ${label} : INCOHÉRENCE DE CALCUL DÉTECTÉE (écrite en base telle quelle, à vérifier) :`);
  for (const error of errors) console.error(`     - ${error}`);
}

// Valide une analyse d'étape 1 (schéma) déjà produite manuellement.
// Contrairement à validateFicheCompleteWithRepair (étape 3, sortie d'un
// appel automatisé), aucune réparation via l'API n'est tentée ici : l'étape
// 1 reste volontairement hors du pipeline automatisé, donc rien ne doit
// déclencher un appel Claude à sa place, pas même pour corriger son JSON.
// Une structure invalide est une erreur bloquante à corriger à la main.
function validateEtape1Local(rawAnalyse, label) {
  const result = validateEtape1Structure(rawAnalyse);
  if (!result.valid) {
    throw new Error(`${label} : structure invalide.\n${result.errors.join("\n")}`);
  }
  warnNotationCoherence(result.analyse.notation_detaillee, label);
  return result.analyse;
}

// Même principe pour fiche_complete (étape 3, schéma à 5 critères).
async function validateFicheCompleteWithRepair(rawFiche, label) {
  const first = validateFicheCompleteStructure(rawFiche);
  if (first.valid) {
    warnNotationCoherence(first.fiche.notation_detaillee, label);
    return first.fiche;
  }

  console.error(`  ⚠️  ${label} : structure invalide, tentative de réparation :`);
  for (const error of first.errors) console.error(`     - ${error}`);

  const repairedData = await repairJsonStructure(rawFiche, first.errors, label);
  const repairedRaw = cleanContenu(extractJson(repairedData));
  const second = validateFicheCompleteStructure(repairedRaw);

  if (!second.valid) {
    throw new Error(`${label} : structure toujours invalide après tentative de réparation.\n${second.errors.join("\n")}`);
  }

  console.log(`  ✓ ${label} réparé avec succès après une tentative.`);
  warnNotationCoherence(second.fiche.notation_detaillee, label);
  return second.fiche;
}

// --- Étape 2 : contrôle qualité (Mistral) -----------------------------------
// Suit exactement le gabarit ÉTAPE 2 de data/prompt-methodologie.md : un
// seul message utilisateur (pas de rôle système), le placeholder
// {{reponse_etape_1}} interpolé avec le JSON complet de l'étape 1.

const MISTRAL_BASE_URL = "https://api.mistral.ai/v1";

async function callMistralJson(userMessage) {
  if (!process.env.MISTRAL_API_KEY) {
    throw new Error("MISTRAL_API_KEY n'est pas défini (voir votre fichier .env).");
  }

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

export async function callMistralQualityControl(etape1) {
  const userMessage = fillTemplate(MISTRAL_TEMPLATE, { reponse_etape_1: JSON.stringify(etape1, null, 2) });
  return callMistralJson(userMessage);
}

// --- Étape 3 : arbitrage final + rédaction (Claude) -------------------------
// Contrairement au pipeline à 4 étapes précédent, cette étape ne reprend pas
// la conversation de l'étape 1 (pas de cache partagé) : suit exactement le
// gabarit ÉTAPE 3, qui réinjecte textuellement l'analyse initiale et le
// contrôle Mistral via {{reponse_etape_1}} / {{reponse_etape_2_ou_null}}.
//
// Décision explicite (à ne pas rouvrir sans raison neuve) : le corpus
// documentaire — dont data/objectifs-de-reference.md — n'est PAS retransmis
// ici. L'étape 3 arbitre sur la base de l'analyse de l'étape 1, qui porte
// déjà les conclusions tirées de ce document (voir prompt-methodologie.md,
// point 1 ter : la consultation du corpus a lieu à l'étape 1, pour qualifier
// le critère Efficacité). Réinjecter le corpus à l'étape 3 reviendrait à lui
// faire refaire une partie de l'analyse, ce qui n'est pas son rôle —
// l'arbitrage porte sur la cohérence entre l'étape 1 et le contrôle Mistral,
// pas sur une nouvelle lecture des sources.
async function arbitrate(etape1, mistralResult) {
  const userMessage = fillTemplate(ARBITRAGE_TEMPLATE, {
    reponse_etape_1: JSON.stringify(etape1, null, 2),
    reponse_etape_2_ou_null: mistralResult ? JSON.stringify(mistralResult.parsed, null, 2) : "null",
  });

  const response = await fetchWithTimeout(`${ANTHROPIC_BASE_URL}/messages`, {
    method: "POST",
    headers: ANTHROPIC_HEADERS,
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 32000,
      thinking: { type: "disabled" },
      messages: [{ role: "user", content: userMessage }],
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Erreur API Anthropic, étape 3 (${response.status}) : ${errorBody}`);
  }

  return readStreamedMessage(response);
}

// --- Estimation de coût -----------------------------------------------------

// Tarifs approximatifs (USD / million de tokens), à ajuster si Anthropic ou
// Mistral changent leurs prix. Sert uniquement à estimer coutPipeline pour
// le suivi interne, ce n'est pas une source de facturation officielle.
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

// usage1 est toujours null : l'étape 1 reste produite manuellement, hors de
// ce pipeline, donc son coût réel n'est jamais connu ici (voir loadEtape1).
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
    note: "tokensEtape1 non disponible : étape 1 réalisée manuellement, hors pipeline automatisé.",
  };
}

// Deux modes d'entrée pour le JSON d'étape 1, produit manuellement (voir
// data/prompt-methodologie.md, ÉTAPE 1) : un chemin de fichier local, ou le
// JSON collé directement en argument (plus pratique pour un usage manuel
// répété, sans avoir à créer un fichier à chaque fois).
function loadEtape1(input) {
  const raw = existsSync(input) ? readFileSync(input, "utf-8") : input;

  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `Impossible de parser le JSON d'étape 1 (ni fichier valide, ni JSON valide en argument direct) : ${error.message}`,
    );
  }
}

// --- Orchestration du pipeline (étapes 2 et 3) ------------------------------
// L'étape 1 (recherche + analyse) est produite manuellement, en dehors de ce
// script — voir loadEtape1() ci-dessus. Le pipeline automatisé enchaîne
// Mistral (étape 2 : contrôle qualité) → Claude (étape 3 : arbitrage final +
// rédaction). Voir en-tête de data/prompt-methodologie.md.
async function runPipeline(etape1Input) {
  const etape1 = validateEtape1Local(loadEtape1(etape1Input), "Étape 1");
  console.log(
    `✓ Étape 1 chargée et validée (score initial : ${etape1.notation_detaillee.score_total}/100${etape1.notation_detaillee.plafond_applique ? `, plafond appliqué — déclencheur : ${etape1.notation_detaillee.plafond_declencheur}` : ""}).`,
  );
  console.log("");

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

  console.log("Étape 3/3 : arbitrage final et rédaction (Claude)...");
  const data3 = await arbitrate(etape1, mistralResult);
  const arbitrage3 = extractJson(data3);

  const auditArbitrage = Array.isArray(arbitrage3.auditArbitrage) ? arbitrage3.auditArbitrage : [];
  const rawFicheComplete = cleanContenu(arbitrage3.fiche_complete ?? {});
  const ficheComplete = await validateFicheCompleteWithRepair(rawFicheComplete, "Étape 3");

  // titre_fiche/resume_court/teaser_accueil/verdict_final sont produits à la
  // racine de la réponse d'étape 3 (rédaction finale) — verdict_final y est
  // prioritaire sur celui, potentiellement resté inchangé, de fiche_complete.
  const parsed = cleanContenu({
    ...ficheComplete,
    titre_fiche: arbitrage3.titre_fiche,
    resume_court: arbitrage3.resume_court,
    teaser_accueil: arbitrage3.teaser_accueil,
    verdict_final: arbitrage3.verdict_final ?? ficheComplete.verdict_final,
  });
  console.log(
    `  ✓ terminé (score final : ${parsed.notation_detaillee.score_total}/100${parsed.notation_detaillee.plafond_applique ? `, plafond appliqué — déclencheur : ${parsed.notation_detaillee.plafond_declencheur}` : ""})`,
  );

  const coutPipeline = buildCoutPipeline({
    usage2: mistralResult?.usage ?? null,
    usage3: data3.usage ?? {},
  });

  return {
    parsed,
    contreAvisMistral: mistralResult?.parsed ?? null,
    auditArbitrage,
    coutPipeline,
  };
}

function parseArgs(argv) {
  const args = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      // Un drapeau sans valeur (rien après, ou un autre --drapeau juste
      // après) est traité comme booléen.
      if (next === undefined || next.startsWith("--")) {
        args[key] = true;
      } else {
        args[key] = next;
        i++;
      }
    } else {
      positional.push(arg);
    }
  }
  return { args, positional };
}

// Le modèle renvoie parfois ces champs comme des tableaux de points plutôt
// qu'une chaîne unique. Le schéma Prisma attend un String — on normalise.
function toText(value) {
  if (Array.isArray(value)) {
    return value.map((item) => `• ${item}`).join("\n");
  }
  return value;
}

const TITRE_MAX_LENGTH = 80;

// Coupe au dernier espace avant la limite pour éviter de tronquer en plein
// milieu d'un mot.
function truncateTitre(text) {
  if (text.length <= TITRE_MAX_LENGTH) return text;
  const truncated = text.slice(0, TITRE_MAX_LENGTH);
  const lastSpace = truncated.lastIndexOf(" ");
  const cut = lastSpace > 40 ? truncated.slice(0, lastSpace) : truncated;
  return `${cut.trimEnd()}…`;
}

// titre_fiche (étape 3, rédaction finale) est prioritaire : produit
// explicitement sans nom de candidat. Repli sur resume_court/
// mesure_reformulee si absent — jamais vide.
function buildTitre(parsed) {
  if (typeof parsed.titre_fiche === "string" && parsed.titre_fiche.trim().length > 0) {
    return truncateTitre(parsed.titre_fiche.trim());
  }

  const candidates = [parsed.resume_court, parsed.mesure_reformulee].filter(
    (value) => typeof value === "string" && value.trim().length > 0,
  );
  if (candidates.length === 0) return null;

  const shortest = candidates.reduce((best, current) =>
    current.length < best.length ? current : best,
  );

  return truncateTitre(shortest);
}

const RESUME_ACCUEIL_MAX_LENGTH = 250;

// Coupe à la dernière phrase complète avant la limite plutôt qu'en plein
// milieu d'un mot, pour rester lisible sur la carte d'accueil.
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

// Résumé journalistique pour la carte "Prix de la semaine" de l'accueil,
// produit à l'étape 3 (teaser_accueil).
function buildResumeAccueil(parsed) {
  if (typeof parsed.teaser_accueil === "string" && parsed.teaser_accueil.trim().length > 0) {
    return truncateResumeAccueil(parsed.teaser_accueil.trim());
  }
  return null;
}

const TEASER_MAX_LENGTH = 500;

// Même logique de coupe que le résumé d'accueil, avec une limite plus haute.
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

// Teaser pour la section "Le résumé de Perlimpinpin IA" de la fiche
// déclaration, dérivé de resume_court.
function buildTeaser(parsed) {
  if (typeof parsed.resume_court === "string" && parsed.resume_court.trim().length > 0) {
    return truncateTeaser(parsed.resume_court.trim());
  }
  return null;
}

// Nettoie la réponse finale du pipeline (étape 3), construit le titre, et
// écrit Candidat/Proposition/Analyse en base — partagé entre le mode single
// et le mode batch. `pipelineResult` a la forme renvoyée par runPipeline().
//
// Ce pipeline (3 étapes) n'utilise plus les colonnes analyseCanonique /
// contenuPublic / controleFideliteEditorial du pipeline à 4 étapes
// précédent (abandonné) — elles restent nullable en base et ne sont pas
// renseignées ici. contenuComplet porte l'intégralité du résultat, comme
// avant le pipeline à 4 étapes.
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
      // Colonnes historiques (Int, non lues par l'UI — la carte "Détail du
      // score" du site lit notation_detaillee directement dans
      // contenuComplet). Barème 2026 (5 critères sans malus, voir
      // data/prompt-methodologie.md) : pas de correspondance 1:1 avec ces 5
      // anciennes colonnes (le nouveau barème a 3 sous-critères
      // d'Opérationnalité en plus des 4 autres critères) — mappage
      // approximatif gardé pour un audit SQL rapide uniquement, jamais lu
      // ni affiché par l'UI.
      scoreSolidite: notation.degre_preparation,
      scoreJuridique: notation.operationnalite_juridique,
      scoreOperationnel: notation.operationnalite_moyens_total,
      scoreBudgetaire: notation.operationnalite_budgetaire,
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
      // En dur, jamais dérivée automatiquement — voir prisma/schema.prisma.
      versionMethodologie: "1.0",
      promptFileModifiedAt: getPromptFileModifiedAt(),
      contenuComplet: parsed,
      contreAvisMistral,
      auditArbitrage,
      coutPipeline,
    },
  });

  return { candidat, proposition, analyse };
}

function printUsage(usage) {
  console.log(`  input_tokens (non caché)      : ${usage.input_tokens ?? "?"}`);
  console.log(`  cache_creation_input_tokens   : ${usage.cache_creation_input_tokens ?? "?"}`);
  console.log(`  cache_read_input_tokens       : ${usage.cache_read_input_tokens ?? "?"}`);
  console.log(`  output_tokens                 : ${usage.output_tokens ?? "?"}`);
}

function printScoreDetail(notation) {
  console.log(
    `  Opérationnalité & Moyens                  : ${notation.operationnalite_moyens_total ?? "?"}/30${notation.plafond_applique ? `  (PLAFOND APPLIQUÉ — déclencheur : ${notation.plafond_declencheur})` : ""}`,
  );
  console.log(
    `    1a. Juridique                           : ${notation.operationnalite_juridique ?? "?"}/10 (${notation.qualification_juridique ?? "?"})`,
  );
  console.log(
    `    1b. Budgétaire                          : ${notation.operationnalite_budgetaire ?? "?"}/10 (${notation.qualification_budgetaire ?? "?"})`,
  );
  console.log(
    `    1c. Moyens humains                      : ${notation.operationnalite_moyens_humains ?? "?"}/10 (${notation.qualification_moyens_humains ?? "?"})`,
  );
  console.log(
    `  Efficacité                                : ${notation.efficacite ?? "?"}/30 (${notation.qualification_efficacite ?? "?"})`,
  );
  console.log(
    `  Effets rebonds & Externalités             : ${notation.effets_rebonds_externalites ?? "?"}/20 (${notation.qualification_effets_rebonds ?? "?"})`,
  );
  console.log(
    `  Degré de préparation                      : ${notation.degre_preparation ?? "?"}/10 (${notation.qualification_preparation ?? "?"})`,
  );
  console.log(
    `  Alignement & Logique globale              : ${notation.alignement_logique ?? "?"}/10 (${notation.qualification_alignement ?? "?"})`,
  );
  console.log(`  Score total (public, unique)               : ${notation.score_total ?? "?"}/100`);
  console.log(`  Appréciation                               : ${notation.appreciation ?? "?"}`);
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
  printUsage(coutPipeline.tokensEtape3 ?? {});
  console.log(`  Coût total estimé (étapes 2+3 seulement) : ~$${coutPipeline.coutEstimeTotal}`);
  console.log(`  Note : ${coutPipeline.note}`);
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

  // L'étape 1 (recherche + analyse) est produite manuellement, en dehors de
  // ce script (voir data/prompt-methodologie.md, ÉTAPE 1) — ce pipeline
  // automatise uniquement les étapes 2 (Mistral) et 3 (arbitrage + rédaction)
  // à partir de son résultat, fourni ici en chemin de fichier ou en JSON collé.
  const etape1Input = args.etape1 ?? positional[0];
  const { candidat: candidatNom, theme, source } = args;

  if (!etape1Input || !candidatNom || !theme || !source) {
    console.error(
      "Usage: node scripts/analyze.js chemin/vers/analyse-etape1.json --candidat \"Nom\" --theme \"Thème\" --source \"Texte de la proposition\"\n" +
        "   ou: node scripts/analyze.js --etape1 '{...JSON collé...}' --candidat \"Nom\" --theme \"Thème\" --source \"...\"",
    );
    process.exitCode = 1;
    return;
  }

  const item = { candidatNom, theme, source };
  const pipelineResult = await runPipeline(etape1Input);
  const saved = await saveAnalysis(item, pipelineResult);

  console.log("");
  console.log(`Titre     : ${saved.proposition.titre}`);
  console.log(`Candidat  : ${saved.candidat.nom} (${saved.candidat.parti})`);
  console.log(`Thème     : ${theme}`);
  console.log(`Analyse   : #${saved.analyse.id} (statut: ${saved.analyse.statut})`);
  console.log(`Verdict   : ${saved.analyse.verdict}`);

  console.log("");
  console.log("Score détaillé par critère :");
  printScoreDetail(pipelineResult.parsed.notation_detaillee);

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
