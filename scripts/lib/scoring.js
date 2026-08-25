import { z } from "zod";

// Barème du pipeline à 3 étapes (voir data/prompt-methodologie.md) : 4
// critères de 25 points + un ajustement juridique bonus-malus (-30..+5).
//
// Différence de philosophie par rapport au pipeline précédent (4 étapes,
// abandonné) : ici, "L'analyse, les notes, la qualification juridique,
// l'arbitrage et le calcul final restent effectués par les IA. Le code
// orchestre les appels, valide le JSON, gère la résilience et stocke les
// résultats" (voir en-tête de data/prompt-methodologie.md). Ce module ne
// recalcule donc JAMAIS score_total à la place du modèle — il valide
// uniquement la STRUCTURE (types, bornes, enums) pour déclencher une
// réparation ciblée en cas de JSON malformé, et expose une vérification de
// cohérence arithmétique à part (checkNotationCoherence) destinée à un
// simple avertissement en log, jamais à une correction silencieuse — même
// principe que la revérification déjà pratiquée dans scripts/pipeline-2-3.js.

// --- Paliers d'appréciation --------------------------------------------------
// Doit rester synchronisé avec SCORE_BANDS dans src/lib/score.js (même
// barème, deux consommateurs différents : ce fichier valide côté pipeline
// d'analyse, score.js affiche côté site).
export const APPRECIATION_BANDS = [
  { min: 90, max: 100, label: "exemplaire" },
  { min: 75, max: 89, label: "solide et chiffré" },
  { min: 60, max: 74, label: "plausible sous condition" },
  { min: 40, max: 59, label: "partiellement fondé" },
  { min: 20, max: 39, label: "fragile" },
  { min: 0, max: 19, label: "irréaliste" },
];

export function computeAppreciation(scoreTotal) {
  const band =
    APPRECIATION_BANDS.find((entry) => scoreTotal >= entry.min) ??
    APPRECIATION_BANDS[APPRECIATION_BANDS.length - 1];
  return band.label;
}

// --- Critères -----------------------------------------------------------------

export const CRITERE_KEYS = ["solidite_factuelle", "efficacite", "operationnel", "cout"];

// analyse_par_criteres (étape 3) utilise "solidite_factuelle" (clé
// descriptive), mais le champ historique notation_detaillee.factuel garde
// son nom d'origine — cette table fait le pont entre les deux.
export const CRITERE_TO_NOTATION_KEY = {
  solidite_factuelle: "factuel",
  efficacite: "efficacite",
  operationnel: "operationnel",
  cout: "cout",
};

// --- Ajustement juridique (-30..+5) -------------------------------------------

const NIVEAU_IMPACT_JURIDIQUE = ["bonus", "neutre", "limite", "significatif", "severe", "majeur"];
const CONFIANCE = ["haute", "moyenne", "faible"];

// Déduit le niveau_impact_juridique attendu à partir du seul ajustement
// numérique (voir data/prompt-methodologie.md, section AJUSTEMENT JURIDIQUE
// INTERNE — -30 À +5) — sert uniquement à un avertissement de cohérence, ne
// bloque jamais la validation structurelle.
export function computeNiveauImpactAttendu(ajustement) {
  if (ajustement >= 1) return "bonus";
  if (ajustement === 0) return "neutre";
  if (ajustement >= -5) return "limite";
  if (ajustement >= -12) return "significatif";
  if (ajustement >= -20) return "severe";
  return "majeur";
}

const NotationDetailleeSchema = z.object({
  factuel: z.number().int().min(0).max(25),
  efficacite: z.number().int().min(0).max(25),
  operationnel: z.number().int().min(0).max(25),
  cout: z.number().int().min(0).max(25),
  somme_4_criteres: z.number().int().min(0).max(100),
  ajustement_juridique: z.number().int().min(-30).max(5),
  niveau_impact_juridique: z.enum(NIVEAU_IMPACT_JURIDIQUE),
  confiance_juridique: z.enum(CONFIANCE),
  justification_juridique: z.string().min(1),
  score_total: z.number().int().min(0).max(100),
  appreciation: z.string().min(1),
});

// Revérifie la cohérence arithmétique de notation_detaillee (somme, clamp,
// étiquette juridique) sans jamais écraser les valeurs produites par le
// modèle — voir l'en-tête de ce fichier. Retourne une liste d'écarts
// destinée uniquement à un console.warn côté appelant.
export function checkNotationCoherence(notation) {
  const errors = [];
  const {
    factuel,
    efficacite,
    operationnel,
    cout,
    somme_4_criteres,
    ajustement_juridique,
    score_total,
    niveau_impact_juridique,
  } = notation;

  const sommeAttendue = factuel + efficacite + operationnel + cout;
  if (sommeAttendue !== somme_4_criteres) {
    errors.push(
      `somme_4_criteres incohérente : attendu ${sommeAttendue} (factuel+efficacite+operationnel+cout), trouvé ${somme_4_criteres}.`,
    );
  }

  const scoreAttendu = Math.max(0, Math.min(100, somme_4_criteres + ajustement_juridique));
  if (scoreAttendu !== score_total) {
    errors.push(
      `score_total incohérent : attendu ${scoreAttendu} (clamp(somme_4_criteres + ajustement_juridique, 0, 100)), trouvé ${score_total}.`,
    );
  }

  const niveauAttendu = computeNiveauImpactAttendu(ajustement_juridique);
  if (niveauAttendu !== niveau_impact_juridique) {
    errors.push(
      `niveau_impact_juridique incohérent : ajustement_juridique=${ajustement_juridique} implique "${niveauAttendu}", trouvé "${niveau_impact_juridique}".`,
    );
  }

  return errors;
}

// --- Schémas étape 1 / fiche_complete (étape 3) -------------------------------
// Champs texte libre : parfois renvoyés en tableau de points par le modèle
// malgré la consigne — cf. toText() dans analyze.js, permissif ici aussi.
const TextOrArray = z.union([z.string(), z.array(z.string())]);

// Champs communs à l'étape 1 et à fiche_complete (étape 3, après arbitrage)
// — voir "FORMAT ÉTAPE 1 — JSON STRICT" dans data/prompt-methodologie.md.
// N'inclut PAS analyse_par_criteres (forme différente selon l'étape, voir
// plus bas) ni resume_court/phrase_teasing (absents de fiche_complete).
const champsCommunsEtape1 = {
  mesure_reformulee: z.string().min(1),
  nature_et_existant: z.string().min(1),
  contexte_programme: TextOrArray.nullable(),
  contexte_national: TextOrArray.nullable(),
  contexte_international: TextOrArray.nullable(),
  impact_environnement: TextOrArray.nullable(),
  analyse_longevites: z.string().min(1),
  impact_temporel_et_sectoriel: TextOrArray.nullable(),
  ce_qui_est_etabli: TextOrArray,
  ce_qui_est_probable: TextOrArray,
  ce_qui_est_discutable: TextOrArray,
  ce_qui_est_inconnu: TextOrArray,
  angles_morts: TextOrArray,
  notation_detaillee: NotationDetailleeSchema,
  verdict_final: z.string().min(1),
  sources_utilisees: z.array(z.any()),
  niveau_de_confiance: z.string().min(1),
  limites: z.string().min(1),
};

// Étape 1 : analyse_par_criteres est un texte libre unique (voir FORMAT
// ÉTAPE 1 — JSON STRICT : "analyse_par_criteres": "..."). Restructuré en
// tableau de 5 objets seulement après arbitrage, à l'étape 3.
export const AnalyseEtape1Schema = z
  .object({
    ...champsCommunsEtape1,
    analyse_par_criteres: z.string().min(1),
    resume_court: z.string().min(1),
    phrase_teasing: z.string().min(1),
  })
  .passthrough();

export function validateEtape1Structure(raw) {
  const zodResult = AnalyseEtape1Schema.safeParse(raw);
  if (!zodResult.success) {
    return {
      valid: false,
      errors: zodResult.error.issues.map((issue) => `${issue.path.join(".") || "(racine)"}: ${issue.message}`),
      analyse: null,
    };
  }
  return { valid: true, errors: [], analyse: zodResult.data };
}

// Étape 3 (arbitrage + rédaction) : analyse_par_criteres devient un tableau
// de 5 objets (4 critères notés /25 + le critère juridique, note/note_max
// null, voir "FORMAT ÉTAPE 3 — JSON STRICT").
const CRITERE_ETAPE3_KEYS = [...CRITERE_KEYS, "juridique"];

const CritereEtape3Schema = z.object({
  critere: z.enum(CRITERE_ETAPE3_KEYS),
  titre: z.string().min(1),
  note: z.number().int().min(0).max(25).nullable(),
  note_max: z.number().int().nullable(),
  est_juridique: z.boolean(),
  texte: z.string().min(1),
});

const AnalyseParCriteresEtape3Schema = z
  .array(CritereEtape3Schema)
  .length(5, "analyse_par_criteres (étape 3) doit contenir exactement 5 objets (4 critères + juridique).")
  .refine(
    (items) => {
      const seen = new Set(items.map((item) => item.critere));
      return seen.size === 5 && CRITERE_ETAPE3_KEYS.every((key) => seen.has(key));
    },
    {
      message:
        "analyse_par_criteres (étape 3) doit contenir exactement les 4 critères plus juridique, sans doublon.",
    },
  );

export const FicheCompleteSchema = z
  .object({
    ...champsCommunsEtape1,
    analyse_par_criteres: AnalyseParCriteresEtape3Schema,
  })
  .passthrough();

export function validateFicheCompleteStructure(raw) {
  const zodResult = FicheCompleteSchema.safeParse(raw);
  if (!zodResult.success) {
    return {
      valid: false,
      errors: zodResult.error.issues.map((issue) => `${issue.path.join(".") || "(racine)"}: ${issue.message}`),
      fiche: null,
    };
  }
  return { valid: true, errors: [], fiche: zodResult.data };
}
