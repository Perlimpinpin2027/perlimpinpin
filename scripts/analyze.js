import "dotenv/config";
import { pathToFileURL } from "node:url";
import { writeFileSync, readFileSync } from "node:fs";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { cleanContenu } from "./lib/clean-text.js";

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

Règles pour le titre court (champ titre_court) :
- ne jamais inclure le nom du candidat (déjà affiché juste à côté sur toutes les cartes du site) ;
- une phrase courte et sobre, centrée sur la mesure elle-même (le chiffre clé ou le mécanisme central), pas sur le jugement qu'on en fait ;
- pas d'adjectif putaclic, pas de ponctuation excessive ;
- éviter le format "Titre : sous-titre" sauf si ça sert vraiment la clarté ;
- longueur cible : une ligne, ~50 à 60 caractères, jamais plus de 2 lignes sur mobile ;
- exemples de référence : "Retour à 62 ans : la réforme des retraites annulée" ; "200 000 postes de fonctionnaires supprimés" ; "Durcir la taxation des transactions financières".

Règles pour le résumé d'accueil (champ resume_accueil) :
- un résumé journalistique, punchy, en 2 à 3 phrases courtes, style chapô d'article de presse — pas une reformulation académique ;
- donne le point fort ET le point faible de la mesure, sans jargon de notation : jamais les mots "score", "verdict", "note", jamais "discutable"/"faisable" tels quels ;
- s'appuie sur un fait concret et chiffré si possible (l'écart entre deux estimations, un précédent, une donnée officielle) plutôt qu'une généralité ;
- longueur cible : 200 à 250 caractères maximum ;
- exemple de référence (calibre le ton et la longueur) : "Retour à 62 ans : la promesse est simple, la facture beaucoup moins. Les estimations de coût varient du simple au quadruple (8 à 32 milliards d'euros), et la Cour des comptes doute de l'effet sur l'emploi. Politiquement cohérent, budgétairement flou."

Règles pour le teaser de la fiche déclaration (champ teaser) :
- un texte journalistique un peu plus développé que le résumé d'accueil, en 3 à 5 phrases ;
- explique ce qu'est la mesure et pose le principal point de tension ou de doute qu'elle soulève ;
- ne donne NI le verdict final NI le score NI aucun terme de notation ("score", "note", "verdict", "discutable", "faisable") ;
- objectif : donner envie de lire le raisonnement complet en dessous, pas le résumer entièrement — reste teasing mais toujours factuel et sobre, jamais putaclic ;
- longueur cible : 400 à 500 caractères maximum ;
- exemple de référence (calibre le ton et la longueur) : "Revenir à 60 ans pour tous, comme avant 2010 : c'est la promesse la plus nette du programme de Mélenchon sur les retraites. Le candidat veut la financer sans toucher à l'âge, uniquement par une hausse progressive des cotisations. Reste à savoir si ce financement suffit vraiment à équilibrer un système déjà sous tension — et ce qu'en pensent les instances chargées de le vérifier."

Format obligatoire de sortie :
1. titre_court
2. resume_accueil
3. teaser
4. resume_court
5. mesure_reformulee
6. mise_en_contexte_dans_le_programme
7. contexte_local
8. contexte_national
9. contexte_international
10. analyse_par_criteres
11. ce_qui_est_etabli
12. ce_qui_est_probable
13. ce_qui_est_discutable
14. ce_qui_est_inconnu
15. angles_morts_et_effets_de_bord
16. notation_detaillee_sur_100
17. verdict_final
18. sources_utilisees
19. niveau_de_confiance
20. limites

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

const JSON_INSTRUCTION = `Réponds UNIQUEMENT en JSON valide, sans texte avant ni après, avec exactement ces clés : titre_court, resume_accueil, teaser, resume_court, mesure_reformulee, mise_en_contexte_dans_le_programme, contexte_local, contexte_national, contexte_international, analyse_par_criteres, ce_qui_est_etabli, ce_qui_est_probable, ce_qui_est_discutable, ce_qui_est_inconnu, angles_morts_et_effets_de_bord, notation_detaillee (objet avec scoreSolidite, scoreJuridique, scoreOperationnel, scoreBudgetaire, scorePertinence, scoreTotal), verdict_final, sources_utilisees, niveau_de_confiance, limites.`;

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
function buildRequestBody(messages, { stream = false } = {}) {
  return {
    model: "claude-sonnet-5",
    max_tokens: 16000,
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
    messages,
    ...(stream ? { stream: true } : {}),
  };
}

// La requête (recherche web + réflexion + génération d'un JSON structuré
// en 17 sections) peut prendre plusieurs minutes. En mode non-streaming,
// le serveur ne renvoie les en-têtes HTTP qu'une fois la réponse complète
// prête, ce qui dépasse le timeout par défaut du client fetch. Le
// streaming envoie les en-têtes dès le début de la génération.
async function callClaude(messages) {
  const response = await fetch(`${ANTHROPIC_BASE_URL}/messages`, {
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

// Lance une analyse pour un seul item, en gérant la reprise si le tool
// web_search atteint la limite d'itérations internes du serveur.
async function analyzeOne(item) {
  let messages = [{ role: "user", content: buildUserMessage(item) }];
  let data = await callClaude(messages);

  while (data.stop_reason === "pause_turn") {
    messages = [
      { role: "user", content: buildUserMessage(item) },
      { role: "assistant", content: data.content },
    ];
    data = await callClaude(messages);
  }

  return data;
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

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    // On vient de payer cet appel — on sauvegarde la sortie brute plutôt
    // que de la perdre, pour pouvoir la récupérer/inspecter manuellement.
    const dumpPath = `./failed-analysis-${Date.now()}.txt`;
    writeFileSync(dumpPath, lastText, "utf-8");
    console.error(`JSON invalide — réponse brute sauvegardée dans ${dumpPath}`);
    throw error;
  }
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

// Le titre affiché sur les cartes vient directement de titre_court, généré
// par le modèle selon les règles du prompt (pas de nom de candidat, centré
// sur la mesure, ~50-60 caractères). Filet de sécurité si le modèle omet
// ce champ : on retombe sur l'ancienne dérivation depuis resume_court /
// mesure_reformulee.
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

// Résumé journalistique pour la carte "Prix de la semaine" de l'accueil,
// généré directement par le modèle (champ resume_accueil).
function buildResumeAccueil(parsed) {
  if (
    typeof parsed.resume_accueil === "string" &&
    parsed.resume_accueil.trim().length > 0
  ) {
    return truncateResumeAccueil(parsed.resume_accueil.trim());
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

// Teaser plus développé pour la section "Le résumé de Perlimpinpin IA" de
// la fiche déclaration, généré directement par le modèle (champ teaser).
function buildTeaser(parsed) {
  if (typeof parsed.teaser === "string" && parsed.teaser.trim().length > 0) {
    return truncateTeaser(parsed.teaser.trim());
  }
  return null;
}

// Nettoie la réponse, construit le titre, et écrit Candidat/Proposition/
// Analyse en base — partagé entre le mode single et le mode batch.
async function saveAnalysis(item, data) {
  // Nettoie les balises <cite index="X-Y">texte</cite> laissées par le tool
  // web_search sur l'ensemble des champs texte, avant toute écriture en base.
  const parsed = cleanContenu(extractJson(data));
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
      scoreFaisabilite: notation.scoreTotal,
      scoreSolidite: notation.scoreSolidite,
      scoreJuridique: notation.scoreJuridique,
      scoreOperationnel: notation.scoreOperationnel,
      scoreBudgetaire: notation.scoreBudgetaire,
      scorePertinence: notation.scorePertinence,
      verdict: toText(parsed.verdict_final),
      resumeAccueil,
      teaser,
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

  return { candidat, proposition, analyse };
}

function printUsage(usage) {
  console.log(`  input_tokens (non caché)      : ${usage.input_tokens ?? "?"}`);
  console.log(`  cache_creation_input_tokens   : ${usage.cache_creation_input_tokens ?? "?"}`);
  console.log(`  cache_read_input_tokens       : ${usage.cache_read_input_tokens ?? "?"}`);
  console.log(`  output_tokens                 : ${usage.output_tokens ?? "?"}`);
}

// --- Batch API (POST /v1/messages/batches) ---------------------------------
// Permet de soumettre plusieurs propositions en une seule requête, traitées
// de façon asynchrone côté Anthropic à 50% du tarif standard. Contrairement
// au mode single, les requêtes de batch sont non-streaming (la Batch API ne
// supporte pas stream:true) — pas de risque de timeout HTTP pour autant,
// puisque la création du batch répond immédiatement avec un id à consulter.

async function createBatch(items) {
  const requests = items.map((item, index) => ({
    custom_id: `item-${index}`,
    params: buildRequestBody(
      [{ role: "user", content: buildUserMessage(item) }],
      { stream: false },
    ),
  }));

  const response = await fetch(`${ANTHROPIC_BASE_URL}/messages/batches`, {
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
  const response = await fetch(`${ANTHROPIC_BASE_URL}/messages/batches/${batchId}`, {
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
  const response = await fetch(resultsUrl, { headers: ANTHROPIC_HEADERS });

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
      const saved = await saveAnalysis(item, data);
      console.log(`✓ ${item.candidatNom} — "${saved.proposition.titre}"`);
      console.log(`  Score   : ${saved.analyse.scoreFaisabilite}/100`);
      console.log(`  Analyse : #${saved.analyse.id} (statut: ${saved.analyse.statut})`);
      printUsage(usage);
    } catch (error) {
      console.error(`✗ ${item.candidatNom} — échec de l'écriture en base : ${error.message}`);
    }
  }

  console.log("");
  console.log("Usage total du batch :");
  printUsage(totalUsage);
  console.log("");

  return totalUsage;
}

async function runBatch(items) {
  console.log(`Soumission d'un batch de ${items.length} proposition(s)...`);
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
  const data = await analyzeOne(item);

  console.log("");
  console.log("Usage API :");
  printUsage(data.usage ?? {});

  const saved = await saveAnalysis(item, data);

  console.log("");
  console.log(`Titre     : ${saved.proposition.titre}`);
  console.log(`Candidat  : ${saved.candidat.nom} (${saved.candidat.parti})`);
  console.log(`Thème     : ${theme}`);
  console.log(`Analyse   : #${saved.analyse.id} (statut: ${saved.analyse.statut})`);
  console.log(`Score     : ${saved.analyse.scoreFaisabilite}/100`);
  console.log(`Verdict   : ${saved.analyse.verdict}`);
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
