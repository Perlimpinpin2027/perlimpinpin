import { z } from "zod";

// Barème V3 (voir data/prompt-methodologie.md) : 4 critères de 25 points
// additionnés par le code (jamais par le modèle) + un ajustement juridique
// bonus-malus (-40..+3) appliqué une seule fois à la somme. Ce module est le
// seul endroit du pipeline qui calcule score_total — les modèles ne font
// jamais l'arithmétique finale (principe #12/#17/#30 de la spec).

// --- Paliers d'appréciation --------------------------------------------------
// Doit rester synchronisé avec SCORE_BANDS dans src/lib/score.js (même
// barème, deux consommateurs différents : ce fichier calcule côté pipeline
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

// --- Schéma des 4 critères ---------------------------------------------------

export const CRITERE_KEYS = ["solidite_factuelle", "efficacite", "operationnel", "cout"];

// analyse_par_criteres utilise "solidite_factuelle" (clé descriptive), mais
// le champ public historique notation_detaillee.factuel garde son nom
// d'origine — cette table fait le pont entre les deux.
export const CRITERE_TO_NOTATION_KEY = {
  solidite_factuelle: "factuel",
  efficacite: "efficacite",
  operationnel: "operationnel",
  cout: "cout",
};

const CritereSchema = z.object({
  critere: z.enum(CRITERE_KEYS),
  titre: z.string().min(1),
  note: z.number().int().min(0).max(25),
  note_max: z.literal(25),
  texte: z.string().min(1),
});

const AnalyseParCriteresSchema = z
  .array(CritereSchema)
  .length(4, "analyse_par_criteres doit contenir exactement 4 objets.")
  .refine(
    (items) => {
      const seen = new Set(items.map((item) => item.critere));
      return seen.size === 4 && CRITERE_KEYS.every((key) => seen.has(key));
    },
    {
      message:
        "analyse_par_criteres doit contenir exactement les 4 critères solidite_factuelle, efficacite, operationnel, cout, sans doublon.",
    },
  );

// --- Schéma de la qualification juridique -----------------------------------

const NIVEAU_IMPACT_JURIDIQUE = ["bonus", "neutre", "limite", "significatif", "severe", "majeur"];
const CONFIANCE = ["haute", "moyenne", "faible"];

export const QualificationJuridiqueSchema = z.object({
  ajustement_juridique: z.number().int().min(-40).max(3),
  niveau_impact_juridique: z.enum(NIVEAU_IMPACT_JURIDIQUE),
  confiance_qualification: z.enum(CONFIANCE),
  nature_contrainte: z.string().nullable(),
  justification_juridique: z.string(),
  voie_mise_en_conformite: z.string().nullable(),
  sources_juridiques: z.array(z.string()),
});

// Déduit le niveau_impact_juridique attendu à partir du seul ajustement
// numérique — sert à détecter une incohérence entre le nombre et son
// étiquette (ex. ajustement = -35 mais niveau_impact_juridique = "significatif").
export function computeNiveauImpactAttendu(ajustement) {
  if (ajustement >= 1) return "bonus";
  if (ajustement === 0) return "neutre";
  if (ajustement >= -8) return "limite";
  if (ajustement >= -20) return "significatif";
  if (ajustement >= -30) return "severe";
  return "majeur";
}

// --- Schéma des sources structurées ------------------------------------------

const SOURCE_TYPES = [
  "texte_juridique",
  "jurisprudence",
  "source_publique",
  "institution_internationale",
  "recherche",
  "programme_politique",
  "presse",
  "autre",
];

export const SourceSchema = z.object({
  id: z.string().min(1),
  titre: z.string().min(1),
  organisme: z.string(),
  url: z.string(),
  date_publication: z.string().nullable(),
  date_consultation: z.string(),
  type: z.enum(SOURCE_TYPES),
});

// --- Schéma complet de la fiche (étape 1 et étape 3) -------------------------
// Volontairement strict sur les parties qui alimentent le calcul (critères,
// qualification juridique, sources) et permissif sur les champs éditoriaux
// (texte libre, parfois renvoyé en tableau de points par le modèle malgré la
// consigne — cf. toText() dans analyze.js).
const TextOrArray = z.union([z.string(), z.array(z.string())]);

export const FicheSchema = z
  .object({
    mesure_reformulee: z.string().min(1),
    nature_et_existant: z.string().min(1),
    contexte_programme: z.string().min(1),
    contexte_national: z.string().min(1),
    contexte_international: z.string().min(1),
    impact_environnement: z.string().nullable(),
    analyse_par_criteres: AnalyseParCriteresSchema,
    qualification_juridique: QualificationJuridiqueSchema,
    analyse_longevites: z.string().min(1),
    impact_temporel_et_sectoriel: z.string().nullable(),
    ce_qui_est_etabli: TextOrArray,
    ce_qui_est_probable: TextOrArray,
    ce_qui_est_discutable: TextOrArray,
    ce_qui_est_inconnu: TextOrArray,
    angles_morts: TextOrArray,
    verdict_final: TextOrArray,
    sources_utilisees: z.array(SourceSchema),
    niveau_de_confiance: z.enum(["faible", "moyen", "eleve"]),
    limites: z.string().min(1),
    resume_court: z.string().min(1),
  })
  .passthrough();

// --- Règles métier non capturables par le schéma seul ------------------------

// "Ne jamais faire référence à un identifiant absent de sources_utilisees."
export function checkSourcesJuridiquesReferences(fiche) {
  const validIds = new Set((fiche.sources_utilisees ?? []).map((source) => source.id));
  return (fiche.qualification_juridique.sources_juridiques ?? [])
    .filter((id) => !validIds.has(id))
    .map((id) => `qualification_juridique.sources_juridiques référence "${id}", absent de sources_utilisees.`);
}

// Section "EXIGENCES DOCUMENTAIRES" : tout malus sévère/majeur (et tout
// bonus) doit être étayé — sinon on refuse de l'appliquer silencieusement
// (voir CAS 4 / section 33 : déclenche une réparation plutôt qu'une
// application silencieuse).
export function checkAjustementJuridiqueDocumentation(qualification) {
  const { ajustement_juridique: adj, justification_juridique, sources_juridiques, confiance_qualification } =
    qualification;
  const errors = [];
  const hasJustification = Boolean(justification_juridique && justification_juridique.trim().length > 0);
  const hasSource = Boolean(sources_juridiques && sources_juridiques.length > 0);

  if (adj <= -31) {
    if (!hasJustification) errors.push("Malus majeur (-31 à -40) sans justification_juridique.");
    if (!hasSource) errors.push("Malus majeur (-31 à -40) sans source juridique primaire (sources_juridiques vide).");
    if (confiance_qualification !== "haute") {
      errors.push(
        `Malus majeur (-31 à -40) exige confiance_qualification "haute", trouvé "${confiance_qualification}".`,
      );
    }
  } else if (adj <= -21) {
    if (!hasJustification) errors.push("Malus sévère (-21 à -30) sans justification_juridique.");
    if (!hasSource) errors.push("Malus sévère (-21 à -30) sans source juridique primaire (sources_juridiques vide).");
    if (confiance_qualification === "faible") {
      errors.push('Malus sévère (-21 à -30) exige confiance_qualification au moins "moyenne", trouvé "faible".');
    }
  } else if (adj >= 1) {
    if (!hasJustification) {
      errors.push("Bonus juridique (+1 à +3) sans justification_juridique (base juridique ou précédent attendu).");
    }
  }

  return errors;
}

// Point d'entrée unique de validation : schéma structurel (Zod) puis règles
// métier. Ne lève jamais d'exception — retourne { valid, errors } pour que
// l'appelant décide de déclencher une réparation plutôt que d'échouer
// silencieusement (section 33).
export function validateFiche(rawFiche) {
  const zodResult = FicheSchema.safeParse(rawFiche);
  if (!zodResult.success) {
    return {
      valid: false,
      errors: zodResult.error.issues.map((issue) => `${issue.path.join(".") || "(racine)"}: ${issue.message}`),
      fiche: null,
    };
  }

  const fiche = zodResult.data;
  const errors = [
    ...checkSourcesJuridiquesReferences(fiche),
    ...checkAjustementJuridiqueDocumentation(fiche.qualification_juridique),
  ];

  const attendu = computeNiveauImpactAttendu(fiche.qualification_juridique.ajustement_juridique);
  if (attendu !== fiche.qualification_juridique.niveau_impact_juridique) {
    errors.push(
      `niveau_impact_juridique incohérent : ajustement_juridique=${fiche.qualification_juridique.ajustement_juridique} implique "${attendu}", trouvé "${fiche.qualification_juridique.niveau_impact_juridique}".`,
    );
  }

  return { valid: errors.length === 0, errors, fiche };
}

// --- Calcul du score (jamais fait confiance au modèle) ----------------------

export function extractCriteresNotes(analyseParCriteres) {
  const notes = {};
  for (const item of analyseParCriteres) {
    notes[CRITERE_TO_NOTATION_KEY[item.critere]] = item.note;
  }
  return notes;
}

export function computeScoreTotal(criteresNotes, ajustementJuridique) {
  const sommeInterne =
    criteresNotes.factuel + criteresNotes.efficacite + criteresNotes.operationnel + criteresNotes.cout;
  const scoreTotal = Math.max(0, Math.min(100, sommeInterne + ajustementJuridique));
  return { sommeInterne, ajustementJuridique, scoreTotal };
}

// Écrase notation_detaillee avec le résultat calculé par le code (seules les
// clés factuel/efficacite/operationnel/cout/score_total/appreciation sont
// publiques — voir section 12/31 : jamais de somme intermédiaire ni
// d'ajustement chiffré exposés séparément). sommeInterne reste disponible
// dans le retour pour un usage interne (audit, logs), jamais persisté dans
// la fiche publique.
export function applyFinalScore(fiche) {
  const criteresNotes = extractCriteresNotes(fiche.analyse_par_criteres);
  const ajustementJuridique = fiche.qualification_juridique.ajustement_juridique;
  const { sommeInterne, scoreTotal } = computeScoreTotal(criteresNotes, ajustementJuridique);
  const appreciation = computeAppreciation(scoreTotal);

  const notationDetaillee = {
    factuel: criteresNotes.factuel,
    efficacite: criteresNotes.efficacite,
    operationnel: criteresNotes.operationnel,
    cout: criteresNotes.cout,
    score_total: scoreTotal,
    appreciation,
  };

  return {
    fiche: { ...fiche, notation_detaillee: notationDetaillee },
    audit: { sommeInterne, ajustementJuridique, scoreTotal },
  };
}
