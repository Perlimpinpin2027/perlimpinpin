import "dotenv/config";
import { pathToFileURL, fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { writeFileSync, readFileSync } from "node:fs";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { cleanContenu } from "./lib/clean-text.js";

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

// --- Étape 1/3 : prompt méthodologique Perlimpinpin (Claude) ---------------

const ANALYSIS_PROMPT = readFileSync(
  join(__dirname, "..", "data", "prompt-methodologie.md"),
  "utf-8",
);

const JSON_INSTRUCTION = `Réponds UNIQUEMENT en JSON valide, sans texte avant ni après, avec exactement ces clés : mesure_reformulee, nature_et_existant, contexte_programme, contexte_national, contexte_international, impact_environnement (chaîne ou null), analyse_par_criteres, analyse_longevites, impact_temporel_et_sectoriel (chaîne ou null), ce_qui_est_etabli, ce_qui_est_probable, ce_qui_est_discutable, ce_qui_est_inconnu, angles_morts, notation_detaillee (objet avec factuel, efficacite, juridique, cout, operationnel, score_total — addition simple des 5 critères, sans malus ni bonus — et appreciation), verdict_final, sources_utilisees, niveau_de_confiance, limites, resume_court, phrase_teasing.`;

export const SYSTEM_PROMPT = `${ANALYSIS_PROMPT}\n\n${JSON_INSTRUCTION}`;

// --- Étape 2/3 : contrôle qualité indépendant (Mistral) ---------------------

const MISTRAL_SYSTEM_PROMPT = `Tu es un contrôleur qualité indépendant pour Perlimpinpin. Une première IA a produit l'analyse JSON ci-dessous sur une proposition politique. Tu ne dois PAS recommencer l'analyse ni proposer de nouveau score.

MISSION (par ordre de priorité) :
1. CHIFFRES ET SOURCES : un chiffre te semble-t-il faux, périmé, ou mal attribué ? Donne ta meilleure estimation alternative et ta confiance (haute/moyenne/faible).
2. QUALIFICATION JURIDIQUE : une affirmation sur la légalité/faisabilité constitutionnelle ou européenne te semble-t-elle erronée ou trop tranchée ? Ne confonds jamais faisabilité juridique et rapport de force politique conjoncturel (une majorité parlementaire actuelle contraire à une mesure n'est PAS un obstacle juridique).
3. COHÉRENCE NOTE/TEXTE : la notation reflète-t-elle vraiment la sévérité de l'analyse écrite juste au-dessus ?
4. ANGLE MORT MAJEUR uniquement : un point structurant absent, pas un détail.

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

// Le nouveau prompt méthodologique (étape 2) attend l'intégralité de
// l'analyse d'étape 1, pas un sous-ensemble choisi côté code : Mistral doit
// pouvoir juger la cohérence entre n'importe quelle section et la notation.
function buildMistralUserMessage(parsed1) {
  return `ANALYSE À CONTRÔLER (JSON) :\n${JSON.stringify(parsed1, null, 2)}`;
}

const MISTRAL_BASE_URL = "https://api.mistral.ai/v1";

// Étape 2 du pipeline. Volontairement isolée dans sa propre fonction pour
// être facile à envelopper dans un try/catch côté appelant (résilience :
// un échec ici ne doit jamais bloquer l'étape 3).
async function callMistralQualityControl(parsed1) {
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
      messages: [
        { role: "system", content: MISTRAL_SYSTEM_PROMPT },
        { role: "user", content: buildMistralUserMessage(parsed1) },
      ],
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

// --- Étape 3/3 : arbitrage final (Claude, conversation prolongée) ----------

// Ne re-colle pas le JSON de l'étape 1 dans ce message (contrairement au
// texte brut du prompt méthodologique, qui suggère "{{reponse_etape_1}}") :
// cette conversation reprend déjà l'historique complet de l'étape 1 (voir
// withCacheBreakpoint / arbitrate), donc Claude y a accès nativement — le
// re-coller doublerait le coût et casserait la réutilisation du cache chaud.
function buildArbitrationUserMessage(mistralResult) {
  const mistralSection = mistralResult
    ? JSON.stringify(mistralResult.parsed, null, 2)
    : "AUCUN — Mistral indisponible";

  return `Voici ton analyse initiale (ci-dessus) et le contrôle qualité de Mistral.

CONTRÔLE MISTRAL :
${mistralSection}

MISSION :
1. Pour chaque remarque de Mistral avec confiance "haute" ou "moyenne" : décide si elle est fondée. Si oui, intègre-la dans la section appropriée et ajuste la notation si ça change vraiment l'évaluation. Ignore les remarques à confiance "faible" sauf si elles pointent un problème évident.
2. Si CONTRÔLE MISTRAL est "AUCUN — Mistral indisponible", ignore le point 1 et conserve ton analyse initiale telle quelle.
3. Si aucune remarque de Mistral n'affecte le fond ou si le contrôle est indisponible, recopie intégralement les champs de ton analyse initiale dans fiche_complete sans modifier leur texte.
4. Remplis le champ interne \`auditArbitrage\` (non public, suivi qualité interne) : pour chaque remarque de Mistral, précise si elle a été acceptée ou rejetée, et pourquoi en une phrase. Tableau vide si CONTRÔLE MISTRAL est indisponible.
5. Ne mentionne JAMAIS, dans les champs destinés à la publication, l'existence d'un second modèle, d'un contrôle qualité, d'un arbitrage, d'un pipeline en plusieurs étapes, ou d'un document de travail interne. Le lecteur ne doit voir qu'une analyse journalistique autonome.
6. Ton humain, légèrement aéré, rigoureux, sans jargon, sans tirets cadratins.

Aucun outil n'est disponible pour ce tour (pas de recherche web, pas d'exécution de code) : n'essaie pas d'en invoquer un, même pour vérifier ou formatter le JSON. Ta réponse doit être uniquement du texte brut.

FORMAT DE SORTIE JSON STRICT, sans texte avant ni après, sans bloc de code, sans commentaire, sans appel d'outil :
{
  "auditArbitrage": [
    {"remarque": "...", "statut": "acceptee|rejetee", "raison": "..."}
  ],
  "fiche_complete": {
    /* tous les champs de ton analyse initiale, mis à jour après arbitrage, SAUF resume_court et phrase_teasing (remontés à la racine ci-dessous) */
  },
  "resume_court": "... (ton journalistique, phrase courte et accrocheuse, pas engagée ni partisane)",
  "teaser_accueil": "... (ton journalistique, deux phrases : résumé + question sur le réalisme, sans utiliser le mot 'réaliste'/'réalisme')"
}
La toute première caractère de ta réponse doit être "{" et le tout dernier "}".`;
}

// Ajoute un point de cache éphémère sur le dernier bloc du dernier message
// (la réponse complète de l'étape 1), pour que l'étape 3 relise depuis le
// cache tout le préfixe déjà généré (system + recherches + analyse
// initiale) plutôt que de le repayer intégralement.
function withCacheBreakpoint(messages) {
  const cloned = messages.map((message) => ({
    ...message,
    content: Array.isArray(message.content)
      ? message.content.map((block) => ({ ...block }))
      : message.content,
  }));
  const lastMessage = cloned[cloned.length - 1];
  if (Array.isArray(lastMessage.content) && lastMessage.content.length > 0) {
    lastMessage.content[lastMessage.content.length - 1].cache_control = {
      type: "ephemeral",
    };
  }
  return cloned;
}

// L'arbitrage ne fait que relire/trancher, il n'a pas besoin de relancer de
// recherches web : tool_choice "none" empêche tout appel de tool sans
// retirer `tools` de la requête, pour que le préfixe (system + tools) reste
// identique à celui de l'étape 1 et que le cache déjà chaud soit réutilisé.
async function arbitrate(priorMessages, mistralResult) {
  const messages = [
    ...withCacheBreakpoint(priorMessages),
    { role: "user", content: buildArbitrationUserMessage(mistralResult) },
  ];

  const response = await fetchWithTimeout(`${ANTHROPIC_BASE_URL}/messages`, {
    method: "POST",
    headers: ANTHROPIC_HEADERS,
    body: JSON.stringify(
      buildRequestBody(messages, {
        stream: true,
        toolChoice: { type: "none" },
        thinking: { type: "disabled" },
      }),
    ),
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
    (prompt_tokens * PRICING.mistralLarge.input +
      completion_tokens * PRICING.mistralLarge.output) /
    1_000_000
  );
}

function buildCoutPipeline({ usage1, usage2, usage3 }) {
  const coutEtape1 = estimateClaudeCost(usage1);
  const coutEtape2 = estimateMistralCost(usage2);
  const coutEtape3 = estimateClaudeCost(usage3);

  return {
    tokensEtape1: usage1,
    tokensEtape2: usage2,
    tokensEtape3: usage3,
    coutEstimeParEtape: {
      etape1: Number(coutEtape1.toFixed(4)),
      etape2: Number(coutEtape2.toFixed(4)),
      etape3: Number(coutEtape3.toFixed(4)),
    },
    coutEstimeTotal: Number((coutEtape1 + coutEtape2 + coutEtape3).toFixed(4)),
  };
}

// --- Orchestration du pipeline à 3 étapes -----------------------------------

async function runPipeline(item) {
  console.log("Étape 1/3 : analyse initiale (Claude)...");
  const { data: data1, priorMessages } = await analyzeOne(item);
  const parsed1 = cleanContenu(extractJson(data1));
  console.log(
    `  ✓ terminé (score initial : ${parsed1.notation_detaillee?.score_total ?? "?"}/100)`,
  );

  console.log("Étape 2/3 : contrôle qualité (Mistral)...");
  let mistralResult = null;
  try {
    mistralResult = await callMistralQualityControl(parsed1);
    console.log(
      `  ✓ terminé (avis général : ${mistralResult.parsed.avis_general ?? "?"}, ${mistralResult.parsed.remarques?.length ?? 0} remarque(s))`,
    );
  } catch (error) {
    console.error(`  ✗ Mistral indisponible, pipeline poursuivi en mode dégradé : ${error.message}`);
  }

  console.log("Étape 3/3 : arbitrage final (Claude)...");
  const data3 = await arbitrate(priorMessages, mistralResult);
  const arbitrage3 = extractJson(data3);

  const auditArbitrage = Array.isArray(arbitrage3.auditArbitrage)
    ? arbitrage3.auditArbitrage
    : [];
  // fiche_complete porte tous les champs de la fiche sauf resume_court et
  // teaser_accueil, remontés à la racine de l'enveloppe d'étape 3 (voir
  // buildArbitrationUserMessage) — on les refusionne ici pour reconstituer
  // une fiche complète unique, de même forme que la sortie de l'étape 1.
  const parsed3 = cleanContenu({
    ...(arbitrage3.fiche_complete ?? {}),
    resume_court: arbitrage3.resume_court,
    teaser_accueil: arbitrage3.teaser_accueil,
  });
  console.log(
    `  ✓ terminé (score final : ${parsed3.notation_detaillee?.score_total ?? "?"}/100)`,
  );

  const coutPipeline = buildCoutPipeline({
    usage1: data1.usage ?? {},
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

const ANTHROPIC_BASE_URL = "https://api.anthropic.com/v1";
const ANTHROPIC_HEADERS = {
  "Content-Type": "application/json",
  "x-api-key": process.env.ANTHROPIC_API_KEY,
  "anthropic-version": "2023-06-01",
};

// Plafond de recherches web par analyse, pour éviter qu'une proposition
// complexe ne déclenche un nombre de recherches excessif et coûteux.
const WEB_SEARCH_MAX_USES = 6;

function buildUserMessage({ candidatNom, theme, source }) {
  return [
    `Candidat : ${candidatNom}`,
    `Thème : ${theme}`,
    "",
    "Proposition à analyser :",
    source,
  ].join("\n");
}

// Corps de requête partagé entre le mode streaming (un seul item) et le
// mode batch (plusieurs items) — seule la présence de `stream` diffère,
// la Batch API n'acceptant que des requêtes non-streaming.
//
// `tools` reste TOUJOURS déclaré à l'identique (même à l'étape 3, qui n'a
// pas besoin de relancer de recherches web) : le cache de prompt d'Anthropic
// dépend du préfixe complet de la requête (system + tools), donc retirer
// `tools` casserait la réutilisation du cache déjà chaud de l'étape 1. Pour
// désactiver l'usage réel des tools sans changer ce préfixe, on passe
// `toolChoice: { type: "none" }` à la place.
function buildRequestBody(messages, { stream = false, toolChoice, thinking } = {}) {
  return {
    model: "claude-sonnet-5",
    // 32000 (et non 16000) pour laisser de la marge à la réflexion adaptative
    // sur les propositions denses en vérifications chiffrées : budget_tokens
    // n'existe plus sur claude-sonnet-5 (400 garanti), donc le seul levier
    // pour éviter qu'un raisonnement long n'épuise tout le budget avant
    // d'écrire le JSON final est un plafond plus généreux. Coût nul si non
    // utilisé — max_tokens est un plafond, pas une dépense garantie.
    max_tokens: 32000,
    // Le prompt système (doctrine, méthode, barème, format) est identique
    // à chaque appel — on le met en cache pour ne pas le repayer en entier
    // à chaque analyse (prix plein la 1ère fois, ~10% du prix ensuite).
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    tools: [
      { type: "web_search_20260209", name: "web_search", max_uses: WEB_SEARCH_MAX_USES },
    ],
    ...(toolChoice ? { tool_choice: toolChoice } : {}),
    // Sur claude-sonnet-5, la réflexion adaptative est active par défaut
    // dès qu'on omet `thinking` (contrairement à Opus 4.7/4.8, où
    // l'omission désactive la réflexion). On ne la désactive explicitement
    // que là où l'appelant le demande (étape 3 : intégration mécanique des
    // retours + mise en forme, pas de raisonnement multi-sources).
    ...(thinking ? { thinking } : {}),
    messages,
    ...(stream ? { stream: true } : {}),
  };
}

// La requête (recherche web + réflexion + génération d'un JSON structuré
// en plusieurs sections) peut prendre plusieurs minutes. En mode non-
// streaming, le serveur ne renvoie les en-têtes HTTP qu'une fois la réponse
// complète prête, ce qui dépasse le timeout par défaut du client fetch. Le
// streaming envoie les en-têtes dès le début de la génération.
async function callClaude(messages) {
  const response = await fetchWithTimeout(`${ANTHROPIC_BASE_URL}/messages`, {
    method: "POST",
    headers: ANTHROPIC_HEADERS,
    body: JSON.stringify(buildRequestBody(messages, { stream: true })),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Erreur API Anthropic (${response.status}) : ${errorBody}`,
    );
  }

  return readStreamedMessage(response);
}

// Retry-with-backoff pour le flux étape 1 : une coupure réseau en plein
// milieu d'un flux SSE (ex. ECONNRESET) ne peut pas être "reprise" à mi-
// chemin, on doit relancer l'appel depuis le début. 3 tentatives, délai
// croissant entre chaque (5s, 10s) pour laisser une éventuelle instabilité
// réseau transitoire se résorber avant de repayer une génération complète.
const CLAUDE_STREAM_MAX_ATTEMPTS = 3;
const CLAUDE_STREAM_RETRY_BASE_DELAY_MS = 5_000;

async function withStreamRetry(callFn, label) {
  let lastError;
  for (let attempt = 1; attempt <= CLAUDE_STREAM_MAX_ATTEMPTS; attempt++) {
    try {
      return await callFn();
    } catch (error) {
      lastError = error;
      const isLastAttempt = attempt === CLAUDE_STREAM_MAX_ATTEMPTS;
      console.error(
        `  ✗ ${label} — tentative ${attempt}/${CLAUDE_STREAM_MAX_ATTEMPTS} échouée : ${error.message}`,
      );
      if (isLastAttempt) break;
      const delayMs = CLAUDE_STREAM_RETRY_BASE_DELAY_MS * 2 ** (attempt - 1);
      console.log(`  … nouvelle tentative dans ${delayMs / 1000}s`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}

// Additionne récursivement plusieurs objets `usage` Anthropic (champs
// numériques sommés, sous-objets comme cache_creation/server_tool_use
// sommés récursivement, champs non numériques comme service_tier gardés
// à la dernière valeur vue). Utilisé quand une étape a nécessité plusieurs
// appels réels (ex. reprise pause_turn) dont chacun a son propre coût.
function sumUsage(usages) {
  const summed = {};
  for (const usage of usages) {
    for (const [key, value] of Object.entries(usage ?? {})) {
      if (typeof value === "number") {
        summed[key] = (summed[key] ?? 0) + value;
      } else if (value && typeof value === "object" && !Array.isArray(value)) {
        summed[key] = sumUsage([summed[key] ?? {}, value]);
      } else {
        summed[key] = value;
      }
    }
  }
  return summed;
}

// Lance l'étape 1 (analyse initiale) pour un seul item, en gérant la reprise
// si le tool web_search atteint la limite d'itérations internes du serveur.
// Retourne aussi `priorMessages`, l'historique complet de la conversation
// (jusqu'à la réponse finale incluse), pour que l'étape 3 puisse reprendre
// cette même conversation et profiter du cache déjà chaud plutôt que de
// repayer le prompt système et les recherches déjà effectuées.
//
// `data.usage` renvoyé ici est la SOMME de tous les appels réels effectués
// (l'appel initial, plus chaque reprise pause_turn) — pas seulement le
// dernier. Chaque reprise est un vrai appel facturé séparément ; ne
// compter que le dernier sous-estimait le coût réel de l'étape 1.
async function analyzeOne(item) {
  let messages = [{ role: "user", content: buildUserMessage(item) }];
  let data = await withStreamRetry(() => callClaude(messages), "Étape 1 (analyse)");
  const usages = [data.usage ?? {}];

  while (data.stop_reason === "pause_turn") {
    messages = [
      { role: "user", content: buildUserMessage(item) },
      { role: "assistant", content: data.content },
    ];
    data = await withStreamRetry(() => callClaude(messages), "Étape 1 (reprise pause_turn)");
    usages.push(data.usage ?? {});
  }

  const priorMessages = [...messages, { role: "assistant", content: data.content }];
  return { data: { ...data, usage: sumUsage(usages) }, priorMessages };
}

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
        console.error("JSON récupéré via filet de secours (échappement et/ou extraction).");
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

// Le modèle renvoie parfois ces champs comme des tableaux de points plutôt
// qu'une chaîne unique. Le schéma Prisma attend un String — on normalise.
function toText(value) {
  if (Array.isArray(value)) {
    return value.map((item) => `• ${item}`).join("\n");
  }
  return value;
}

const TITRE_MAX_LENGTH = 80;

// Coupe au dernier espace avant la limite pour éviter de tronquer en
// plein milieu d'un mot.
function truncateTitre(text) {
  if (text.length <= TITRE_MAX_LENGTH) return text;
  const truncated = text.slice(0, TITRE_MAX_LENGTH);
  const lastSpace = truncated.lastIndexOf(" ");
  const cut = lastSpace > 40 ? truncated.slice(0, lastSpace) : truncated;
  return `${cut.trimEnd()}…`;
}

// Le nouveau schéma ne produit plus de titre_court dédié : on dérive
// systématiquement le titre depuis resume_court / mesure_reformulee (le
// bloc titre_court ci-dessous reste en filet de sécurité si un ancien
// contenu ou un futur prompt le réintroduit).
function buildTitre(parsed) {
  if (typeof parsed.titre_court === "string" && parsed.titre_court.trim().length > 0) {
    return truncateTitre(parsed.titre_court.trim());
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

// Résumé journalistique pour la carte "Prix de la semaine" de l'accueil.
// L'ancien champ dédié resume_accueil a disparu du nouveau schéma ; on lui
// substitue teaser_accueil (produit à l'étape 3, explicitement nommé pour
// l'accueil : résumé + question), le candidat le plus proche par le nom.
function buildResumeAccueil(parsed) {
  if (
    typeof parsed.teaser_accueil === "string" &&
    parsed.teaser_accueil.trim().length > 0
  ) {
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
// déclaration. L'ancien champ dédié teaser (400-500 caractères développés)
// a disparu du nouveau schéma, qui ne produit plus de format long ; on lui
// substitue resume_court (le champ le plus proche disponible), plus court
// que l'ancien format.
function buildTeaser(parsed) {
  if (typeof parsed.resume_court === "string" && parsed.resume_court.trim().length > 0) {
    return truncateTeaser(parsed.resume_court.trim());
  }
  return null;
}

// Nettoie la réponse finale du pipeline (étape 3), construit le titre, et
// écrit Candidat/Proposition/Analyse en base — partagé entre le mode single
// et le mode batch. `pipelineResult` a la forme renvoyée par runPipeline().
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
      // contenuComplet). Réalignées par SENS avec les 5 critères du nouveau
      // barème (factuel/efficacite/juridique/cout/operationnel) : 4 des 5
      // colonnes correspondent maintenant exactement à leur nom
      // (scoreSolidite/scoreJuridique/scoreBudgetaire/scoreOperationnel).
      // Il ne reste que scorePertinence sans critère de même nom dans le
      // nouveau barème : on y range "efficacite" (efficacité attendue),
      // le seul critère restant, comme c'était déjà le cas avec l'ancien
      // schéma (voir historique de ce fichier).
      scoreSolidite: notation.factuel,
      scoreJuridique: notation.juridique,
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
      versionMethodologie: "v3.0-pipeline3etapes",
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
  console.log(`  Solidité factuelle et documentaire        : ${notation.factuel ?? "?"}/20`);
  console.log(`  Efficacité attendue                       : ${notation.efficacite ?? "?"}/20`);
  console.log(`  Faisabilité juridique et réglementaire    : ${notation.juridique ?? "?"}/25`);
  console.log(`  Coût et soutenabilité budgétaire          : ${notation.cout ?? "?"}/20`);
  console.log(`  Faisabilité opérationnelle                : ${notation.operationnel ?? "?"}/15`);
  console.log(`  Score total                                : ${notation.score_total ?? "?"}/100`);
}

function printCoutPipeline(coutPipeline) {
  console.log(`  Étape 1 (Claude, analyse)   : ~$${coutPipeline.coutEstimeParEtape.etape1}`);
  printUsage(coutPipeline.tokensEtape1 ?? {});
  console.log(`  Étape 2 (Mistral, contrôle) : ~$${coutPipeline.coutEstimeParEtape.etape2}`);
  if (coutPipeline.tokensEtape2) {
    console.log(`    prompt_tokens     : ${coutPipeline.tokensEtape2.prompt_tokens ?? "?"}`);
    console.log(`    completion_tokens : ${coutPipeline.tokensEtape2.completion_tokens ?? "?"}`);
  } else {
    console.log("    (Mistral indisponible, étape non exécutée)");
  }
  console.log(`  Étape 3 (Claude, arbitrage) : ~$${coutPipeline.coutEstimeParEtape.etape3}`);
  printUsage(coutPipeline.tokensEtape3 ?? {});
  console.log(`  Coût total estimé            : ~$${coutPipeline.coutEstimeTotal}`);
}

// --- Batch API (POST /v1/messages/batches) ---------------------------------
// Permet de soumettre plusieurs propositions en une seule requête, traitées
// de façon asynchrone côté Anthropic à 50% du tarif standard. Contrairement
// au mode single, les requêtes de batch sont non-streaming (la Batch API ne
// supporte pas stream:true) — pas de risque de timeout HTTP pour autant,
// puisque la création du batch répond immédiatement avec un id à consulter.
//
// Limitation connue : le mode batch ne fait tourner que l'étape 1 du
// pipeline (analyse Claude). Les étapes 2 (Mistral) et 3 (arbitrage) sont
// pensées comme une conversation Claude prolongée, incompatible avec le
// traitement asynchrone en lot de la Batch API — à étendre séparément si
// le contrôle qualité en masse devient nécessaire.

async function createBatch(items) {
  const requests = items.map((item, index) => ({
    custom_id: `item-${index}`,
    params: buildRequestBody(
      [{ role: "user", content: buildUserMessage(item) }],
      { stream: false },
    ),
  }));

  const response = await fetchWithTimeout(`${ANTHROPIC_BASE_URL}/messages/batches`, {
    method: "POST",
    headers: ANTHROPIC_HEADERS,
    body: JSON.stringify({ requests }),
  });

  if (!response.ok) {
    throw new Error(
      `Erreur création batch (${response.status}) : ${await response.text()}`,
    );
  }

  return response.json();
}

async function retrieveBatch(batchId) {
  const response = await fetchWithTimeout(`${ANTHROPIC_BASE_URL}/messages/batches/${batchId}`, {
    headers: ANTHROPIC_HEADERS,
  });

  if (!response.ok) {
    throw new Error(
      `Erreur consultation batch (${response.status}) : ${await response.text()}`,
    );
  }

  return response.json();
}

const BATCH_POLL_INTERVAL_MS = 15_000;
// La plupart des batches se terminent en moins d'une heure (max documenté :
// 24h) ; au-delà de ce délai on arrête de bloquer le script, mais le batch
// continue de tourner côté Anthropic et reste consultable via son id.
const BATCH_MAX_WAIT_MS = 60 * 60 * 1000;

async function waitForBatch(batchId) {
  const startedAt = Date.now();

  while (true) {
    const batch = await retrieveBatch(batchId);
    const counts = batch.request_counts ?? {};
    console.log(
      `  statut : ${batch.processing_status} (succeeded=${counts.succeeded ?? 0}, errored=${counts.errored ?? 0}, processing=${counts.processing ?? 0})`,
    );

    if (batch.processing_status === "ended") return batch;

    if (Date.now() - startedAt > BATCH_MAX_WAIT_MS) {
      throw new Error(
        `Le batch ${batchId} n'est pas terminé après ${BATCH_MAX_WAIT_MS / 60000} minutes. ` +
          "Il continue de tourner côté Anthropic ; relancez la consultation plus tard avec cet id.",
      );
    }

    await new Promise((resolve) => setTimeout(resolve, BATCH_POLL_INTERVAL_MS));
  }
}

// Les résultats sont au format JSONL : une ligne JSON par requête, dans un
// ordre non garanti — on indexe par custom_id, jamais par position.
async function fetchBatchResults(resultsUrl) {
  const response = await fetchWithTimeout(resultsUrl, { headers: ANTHROPIC_HEADERS });

  if (!response.ok) {
    throw new Error(
      `Erreur récupération résultats batch (${response.status}) : ${await response.text()}`,
    );
  }

  const text = await response.text();
  const results = new Map();

  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    const entry = JSON.parse(line);
    results.set(entry.custom_id, entry.result);
  }

  return results;
}

// Attend la fin d'un batch déjà créé et écrit les résultats en base. Séparé
// de runBatch() pour pouvoir reprendre le suivi d'un batch existant (--resume-
// batch) sans le recréer si le polling local a été interrompu — le batch
// continue de tourner côté Anthropic indépendamment du script local, et le
// recréer facturerait une deuxième fois les mêmes analyses.
async function finishBatch(batchId, items) {
  const finished = await waitForBatch(batchId);
  console.log("");
  console.log(`Batch terminé : ${batchId}`);

  const results = await fetchBatchResults(finished.results_url);
  const totalUsage = {
    input_tokens: 0,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
    output_tokens: 0,
  };

  for (const [index, item] of items.entries()) {
    const customId = `item-${index}`;
    const result = results.get(customId);
    console.log("");

    if (!result) {
      console.error(`✗ ${item.candidatNom} — aucun résultat trouvé pour ${customId}`);
      continue;
    }

    if (result.type !== "succeeded") {
      const detail = result.error ? ` : ${result.error.message}` : "";
      console.error(`✗ ${item.candidatNom} — ${result.type}${detail}`);
      continue;
    }

    const data = result.message;

    // web_search est un outil serveur ; si la limite d'itérations internes du
    // serveur est atteinte, l'API renvoie stop_reason "pause_turn". La reprise
    // automatique (comme en mode single) n'est pas gérée en mode batch — on
    // journalise l'échec plutôt que d'enregistrer une analyse incomplète.
    if (data.stop_reason === "pause_turn") {
      console.error(`✗ ${item.candidatNom} — analyse interrompue (pause_turn), non enregistrée`);
      continue;
    }

    const usage = data.usage ?? {};
    for (const key of Object.keys(totalUsage)) {
      totalUsage[key] += usage[key] ?? 0;
    }

    try {
      const parsed = cleanContenu(extractJson(data));
      const pipelineResult = {
        parsed,
        contreAvisMistral: null,
        auditArbitrage: [],
        coutPipeline: buildCoutPipeline({ usage1: usage, usage2: null, usage3: {} }),
      };
      const saved = await saveAnalysis(item, pipelineResult);
      console.log(`✓ ${item.candidatNom} — "${saved.proposition.titre}"`);
      console.log(`  Score   : ${saved.analyse.scoreFaisabilite}/100`);
      console.log(`  Analyse : #${saved.analyse.id} (statut: ${saved.analyse.statut})`);
      printUsage(usage);
    } catch (error) {
      console.error(`✗ ${item.candidatNom} — échec de l'écriture en base : ${error.message}`);
    }
  }

  console.log("");
  console.log("Usage total du batch (étape 1 uniquement) :");
  printUsage(totalUsage);
  console.log("");

  return totalUsage;
}

async function runBatch(items) {
  console.log(`Soumission d'un batch de ${items.length} proposition(s)...`);
  console.log("(mode batch : étape 1 uniquement, voir limitation connue en commentaire)");
  const batch = await createBatch(items);
  console.log(`Batch créé : ${batch.id} (statut initial : ${batch.processing_status})`);
  console.log("");

  return finishBatch(batch.id, items);
}

function readBatchFile(path) {
  const raw = JSON.parse(readFileSync(path, "utf-8"));
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error(
      "Le fichier --batch doit contenir un tableau JSON non vide de { candidat, theme, source }.",
    );
  }

  return raw.map((entry, index) => {
    if (!entry.candidat || !entry.theme || !entry.source) {
      throw new Error(
        `Entrée #${index} du batch invalide : candidat, theme et source sont requis.`,
      );
    }
    return { candidatNom: entry.candidat, theme: entry.theme, source: entry.source };
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error(
      "ANTHROPIC_API_KEY n'est pas défini (voir votre fichier .env).",
    );
    process.exitCode = 1;
    return;
  }

  if (!process.env.MISTRAL_API_KEY) {
    console.warn(
      "MISTRAL_API_KEY n'est pas défini : l'étape 2 (contrôle qualité) sera sautée, pipeline en mode dégradé.",
    );
  }

  if (args.batch && args["resume-batch"]) {
    // Reprend le suivi d'un batch déjà soumis (ex. après une coupure réseau
    // pendant le polling) sans le recréer — il continue de tourner côté
    // Anthropic indépendamment du script local.
    const items = readBatchFile(args.batch);
    await finishBatch(args["resume-batch"], items);
    return;
  }

  if (args.batch) {
    const items = readBatchFile(args.batch);
    await runBatch(items);
    return;
  }

  const { candidat: candidatNom, theme, source } = args;

  if (!candidatNom || !theme || !source) {
    console.error(
      "Usage: node scripts/analyze.js --candidat \"Nom\" --theme \"Thème\" --source \"Texte ou url de la proposition\"\n" +
        "   ou: node scripts/analyze.js --batch chemin/vers/propositions.json\n" +
        "   ou: node scripts/analyze.js --batch chemin/vers/propositions.json --resume-batch msgbatch_...",
    );
    process.exitCode = 1;
    return;
  }

  const item = { candidatNom, theme, source };
  const pipelineResult = await runPipeline(item);
  const saved = await saveAnalysis(item, pipelineResult);

  console.log("");
  console.log(`Titre     : ${saved.proposition.titre}`);
  console.log(`Candidat  : ${saved.candidat.nom} (${saved.candidat.parti})`);
  console.log(`Thème     : ${theme}`);
  console.log(`Analyse   : #${saved.analyse.id} (statut: ${saved.analyse.statut})`);
  console.log(`Verdict   : ${saved.analyse.verdict}`);

  console.log("");
  console.log("Score détaillé par critère :");
  printScoreDetail(pipelineResult.parsed.notation_detaillee ?? {});

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
