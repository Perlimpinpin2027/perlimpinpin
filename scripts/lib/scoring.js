import { z } from "zod";

// Barème V4 (voir data/prompt-arbitrage.md et data/prompt-methodologie.md) :
// 4 critères de 25 points additionnés par le code (jamais par le modèle) +
// un ajustement juridique bonus-malus (-40..+3) appliqué une seule fois à
// la somme. Ce module est le seul endroit du pipeline qui calcule
// score_total — les modèles ne font jamais l'arithmétique finale.
//
// Différence structurante par rapport au pipeline V3 : l'étape 1 (et
// l'analyse_canonique finale de l'étape 3) ne produisent plus de
// notation_detaillee du tout — seulement les 4 notes dans
// analyse_par_criteres et la qualification_juridique. notation_detaillee
// est entièrement construit ici, jamais lu depuis la sortie du modèle.
//
// Deuxième différence : tout ajustement juridique non nul doit désormais
// être tracé jusqu'à une preuve (affirmations_juridiques), y compris un
// petit malus limité (-1 à -8) — pas seulement les malus sévères/majeurs
// comme en V3. Si la preuve reste insuffisante après une tentative de
// réparation (orchestrée par analyze.js, pas ici), l'ajustement est
// neutralisé à 0 plutôt que de faire échouer toute l'analyse — voir
// neutralizeAjustementJuridique().

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

// --- Schéma des 4 critères (inchangé depuis V3) ------------------------------

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

// --- Périmètre de compétence et sous-mesures (nouveau en V4) ----------------

const NIVEAU_DECISION = ["local", "regional", "national", "europeen", "international", "mixte", "inconnu"];
const DEGRE_PRECISION = ["eleve", "moyen", "faible"];

export const PerimetreCompetenceSchema = z.object({
  territoire: z.string().nullable(),
  niveau_decision: z.enum(NIVEAU_DECISION),
  autorite_competente: z.string().nullable(),
  horizon_annonce: z.string().nullable(),
  degre_precision: z.enum(DEGRE_PRECISION),
});

export const SousMesureSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  importance: z.enum(["centrale", "secondaire"]),
  dependances: z.array(z.string()),
});

// --- Qualification juridique v4 (affirmations_juridiques tracées) -----------

const NIVEAU_IMPACT_JURIDIQUE = ["bonus", "neutre", "limite", "significatif", "severe", "majeur"];
const CONFIANCE = ["haute", "moyenne", "faible"];
const DEGRE_APPLICABILITE = ["directe", "probable", "discutable"];

export const AffirmationJuridiqueSchema = z.object({
  id: z.string().min(1),
  affirmation: z.string(),
  norme_ou_engagement: z.string(),
  source_ids: z.array(z.string()),
  portee_de_la_source: z.string(),
  application_a_la_proposition: z.string(),
  degre_applicabilite: z.enum(DEGRE_APPLICABILITE),
  confiance: z.enum(CONFIANCE),
  incidence_sur_ajustement: z.string(),
});

// Note : contrairement à V3, le schéma structurel n'exige PAS
// affirmations_juridiques non vide quand ajustement_juridique != 0 — cette
// exigence est vérifiée séparément par checkAjustementDocumentation(), qui
// mène à une neutralisation (pas à un échec de validation) si elle
// n'est pas remplie. Voir la section "EXIGENCES DOCUMENTAIRES" du prompt.
export const QualificationJuridiqueSchema = z.object({
  ajustement_juridique: z.number().int().min(-40).max(3),
  niveau_impact_juridique: z.enum(NIVEAU_IMPACT_JURIDIQUE),
  confiance_qualification: z.enum(CONFIANCE),
  nature_contrainte: z.string().nullable(),
  justification_juridique_technique: z.string(),
  voie_mise_en_conformite: z.string().nullable(),
  sources_juridiques: z.array(z.string()),
  affirmations_juridiques: z.array(AffirmationJuridiqueSchema),
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

// --- Schéma des sources structurées (inchangé depuis V3) --------------------

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

// --- Schéma de l'analyse canonique (étape 1 ET analyse_canonique d'étape 3,
// même forme dans les deux cas — voir FORMAT JSON ÉTAPE 1 / section 27) ----
// Volontairement strict sur les parties qui alimentent le calcul (critères,
// qualification juridique, sources) et permissif sur les champs éditoriaux
// (texte libre, parfois renvoyé en tableau de points par le modèle malgré
// la consigne — cf. toText() dans analyze.js). N'inclut PAS
// notation_detaillee, score_total, verdict_final, resume_court ni
// teaser_accueil : en V4 ces champs n'existent plus dans l'analyse
// canonique (score_total est calculé séparément par le code, les contenus
// éditoriaux vivent dans brief_publication/contenu_public/
// contenu_public_secours, jamais dans l'analyse canonique elle-même).
const TextOrArray = z.union([z.string(), z.array(z.string())]);

export const AnalyseCanoniqueSchema = z
  .object({
    mesure_reformulee: z.string().min(1),
    perimetre_competence: PerimetreCompetenceSchema,
    sous_mesures: z.array(SousMesureSchema),
    nature_et_existant: z.string().min(1),
    contexte_programme: z.string().nullable(),
    contexte_national: z.string().nullable(),
    contexte_international: z.string().nullable(),
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
    sources_utilisees: z.array(SourceSchema),
    niveau_de_confiance: z.enum(["faible", "moyen", "eleve"]),
    limites: z.string().min(1),
  })
  .passthrough();

// Validation purement structurelle (types, enums, bornes, exactement 4
// critères, aucun doublon, cohérence niveau_impact_juridique/ajustement).
// Ne vérifie PAS si l'ajustement juridique est suffisamment documenté —
// c'est le rôle de checkAjustementDocumentation, dont l'échec mène à une
// neutralisation et non à un rejet de toute l'analyse. Un échec ICI (type
// incorrect, mauvais nombre de critères...) reste traité comme avant :
// une tentative de réparation, puis échec de l'étape si toujours invalide.
export function validateAnalyseCanoniqueStructure(raw) {
  const zodResult = AnalyseCanoniqueSchema.safeParse(raw);
  if (!zodResult.success) {
    return {
      valid: false,
      errors: zodResult.error.issues.map((issue) => `${issue.path.join(".") || "(racine)"}: ${issue.message}`),
      analyseCanonique: null,
    };
  }

  const analyseCanonique = zodResult.data;
  const errors = [];

  const attendu = computeNiveauImpactAttendu(analyseCanonique.qualification_juridique.ajustement_juridique);
  if (attendu !== analyseCanonique.qualification_juridique.niveau_impact_juridique) {
    errors.push(
      `niveau_impact_juridique incohérent : ajustement_juridique=${analyseCanonique.qualification_juridique.ajustement_juridique} implique "${attendu}", trouvé "${analyseCanonique.qualification_juridique.niveau_impact_juridique}".`,
    );
  }

  return { valid: errors.length === 0, errors, analyseCanonique };
}

// --- Schéma du contenu public (étape 4, éditorial) --------------------------
// Beaucoup plus permissif que l'analyse canonique : uniquement les champs
// éditoriaux destinés au lecteur, sans note ni note_max par critère (les
// valeurs chiffrées viennent exclusivement de notation_detaillee, calculé
// côté code — le contenu public ne fait que les mettre en mots). La
// fidélité de ce texte à l'analyse canonique (pas de fait ajouté, chiffres/
// dates/citations repris fidèlement) n'est PAS vérifiée ici : c'est le rôle
// du contrôle de fidélité éditoriale, orchestré séparément dans analyze.js.
const ContenuCritereSchema = z.object({
  critere: z.enum(CRITERE_KEYS),
  titre: z.string().min(1),
  texte: z.string().min(1),
});

const ContenuParCriteresSchema = z
  .array(ContenuCritereSchema)
  .length(4, "contenu_public.analyse_par_criteres doit contenir exactement 4 objets.")
  .refine(
    (items) => {
      const seen = new Set(items.map((item) => item.critere));
      return seen.size === 4 && CRITERE_KEYS.every((key) => seen.has(key));
    },
    {
      message: "contenu_public.analyse_par_criteres doit contenir exactement les 4 critères, sans doublon.",
    },
  );

export const ContenuPublicSchema = z.object({
  titre_fiche: z.string().min(1),
  verdict_final: z.string().min(1),
  resume_court: z.string().min(1),
  teaser_accueil: z.string().min(1),
  analyse_par_criteres: ContenuParCriteresSchema,
});

export function validateContenuPublicStructure(raw) {
  const zodResult = ContenuPublicSchema.safeParse(raw);
  if (!zodResult.success) {
    return {
      valid: false,
      errors: zodResult.error.issues.map((issue) => `${issue.path.join(".") || "(racine)"}: ${issue.message}`),
      contenuPublic: null,
    };
  }
  return { valid: true, errors: [], contenuPublic: zodResult.data };
}

// --- Documentation de l'ajustement juridique (section 10 : durcissement V4) -
// Types considérés comme "source juridique primaire" au sens strict de la
// spec (Constitution, loi, décision CC/CE, jurisprudence, texte européen,
// CJUE, traité) — exigés pour tout ajustement de -9 et au-delà.
const PRIMARY_SOURCE_TYPES = new Set(["texte_juridique", "jurisprudence"]);

// Types considérés comme "preuve officielle ou primaire" au sens large
// (section 10, tier -1 à -8 et bonus) : tout sauf presse et "autre", qui
// ne peuvent jamais à eux seuls justifier un ajustement chiffré.
const OFFICIAL_OR_PRIMARY_SOURCE_TYPES = new Set([
  "texte_juridique",
  "jurisprudence",
  "source_publique",
  "institution_internationale",
  "recherche",
  "programme_politique",
]);

// Vérifie si l'ajustement juridique proposé est suffisamment tracé jusqu'à
// des preuves effectivement consultées (section 10 + "VÉRIFICATION DE LA
// QUALIFICATION JURIDIQUE"). Ne lève jamais d'exception : retourne
// { sufficient, errors } pour que l'appelant décide (tentative de
// réparation, puis neutralisation à 0 si toujours insuffisant — jamais un
// rejet de l'analyse entière pour ce seul motif).
export function checkAjustementDocumentation(qualificationJuridique, sourcesUtilisees) {
  const {
    ajustement_juridique: adj,
    justification_juridique_technique,
    affirmations_juridiques,
    confiance_qualification,
    sources_juridiques,
  } = qualificationJuridique;

  if (adj === 0) return { sufficient: true, errors: [] };

  const errors = [];
  const sourceById = new Map((sourcesUtilisees ?? []).map((source) => [source.id, source]));

  if (!justification_juridique_technique || justification_juridique_technique.trim().length === 0) {
    errors.push("Ajustement non nul sans justification_juridique_technique.");
  }

  for (const id of sources_juridiques ?? []) {
    if (!sourceById.has(id)) {
      errors.push(`sources_juridiques référence "${id}", absent de sources_utilisees.`);
    }
  }

  const affirmations = affirmations_juridiques ?? [];
  if (affirmations.length === 0) {
    errors.push("Ajustement non nul sans affirmations_juridiques (liste vide) — toute affirmation qui contribue à l'ajustement doit être tracée.");
  }

  // Sources réellement résolues (existantes) pour chaque affirmation — sert
  // ensuite à vérifier le niveau de preuve exigé selon l'ampleur du malus.
  const resolved = affirmations.map((affirmation) => {
    const ids = affirmation.source_ids ?? [];
    const sources = ids.map((id) => sourceById.get(id)).filter(Boolean);
    if (ids.length === 0 || sources.length !== ids.length) {
      errors.push(`Affirmation ${affirmation.id ?? "?"} référence une source absente de sources_utilisees.`);
    }
    if (!affirmation.portee_de_la_source || affirmation.portee_de_la_source.trim().length === 0) {
      errors.push(`Affirmation ${affirmation.id ?? "?"} sans portee_de_la_source (la portée réelle de la source doit être explicitée).`);
    }
    if (!affirmation.application_a_la_proposition || affirmation.application_a_la_proposition.trim().length === 0) {
      errors.push(`Affirmation ${affirmation.id ?? "?"} sans application_a_la_proposition.`);
    }
    return { affirmation, sources };
  });

  if (adj <= -9) {
    // Malus significatif (-9..-20), sévère (-21..-30) ou majeur (-31..-40).
    const hasPrimarySource = resolved.some(({ sources }) => sources.some((s) => PRIMARY_SOURCE_TYPES.has(s.type)));
    if (!hasPrimarySource) {
      errors.push(
        "Malus de -9 et au-delà sans source juridique primaire (texte_juridique ou jurisprudence) — une analyse de presse, un programme adverse ou une doctrine isolée ne suffisent jamais ici.",
      );
    }
    if (confiance_qualification === "faible") {
      errors.push("Malus de -9 et au-delà exige une confiance_qualification au moins moyenne.");
    }
    const hasDirectlyApplicable = affirmations.some((a) => a.degre_applicabilite === "directe");
    if (!hasDirectlyApplicable) {
      errors.push(
        'Malus de -9 et au-delà sans affirmation à degre_applicabilite "directe" — la source pourrait protéger une population, un territoire ou un mécanisme différent de celui de la proposition (voir TEST F).',
      );
    }
  } else {
    // Malus limité (-1..-8) ou bonus (+1..+3) : preuve "officielle ou
    // primaire" au sens large suffit, mais pas la presse seule.
    const hasOfficialOrPrimary = resolved.some(({ sources }) =>
      sources.some((s) => OFFICIAL_OR_PRIMARY_SOURCE_TYPES.has(s.type)),
    );
    if (!hasOfficialOrPrimary) {
      errors.push("Ajustement non nul sans preuve officielle ou primaire effectivement consultée (une source de presse seule ne suffit pas).");
    }
  }

  if (adj <= -31 && confiance_qualification !== "haute") {
    errors.push('Malus majeur (-31 à -40) exige confiance_qualification "haute".');
  }

  return { sufficient: errors.length === 0, errors };
}

// Neutralise un ajustement juridique insuffisamment documenté : ramené à 0,
// niveau_impact_juridique à "neutre". Le reste (justification_juridique_
// technique, affirmations_juridiques, nature_contrainte,
// voie_mise_en_conformite, sources_juridiques) est conservé tel quel — ce
// n'est pas que la mesure est jugée conforme, c'est que Perlimpinpin n'a
// pas pu établir suffisamment la contrainte invoquée. L'incertitude doit
// rester visible dans l'analyse canonique (section 10, dernier paragraphe).
// Pure transformation : ne décide pas quand l'appeler (c'est à
// l'orchestration d'analyze.js, après une tentative de réparation ciblée,
// de logger ajustement_juridique_neutralise_pour_preuve_insuffisante=true
// et d'appeler cette fonction).
export function neutralizeAjustementJuridique(qualificationJuridique) {
  return {
    ...qualificationJuridique,
    ajustement_juridique: 0,
    niveau_impact_juridique: "neutre",
  };
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

// Construit notation_detaillee exclusivement côté code (section 30) à
// partir de l'analyse canonique (déjà validée structurellement, et dont
// l'ajustement juridique a déjà été résolu — documenté ou neutralisé à 0
// par l'appelant). Contrairement à V3, il n'y a rien à "écraser" : l'objet
// notation_detaillee n'existe nulle part dans la sortie du modèle, il est
// entièrement neuf. sommeInterne et ajustementJuridique sont retournés à
// part, pour un usage interne (audit/logs) uniquement — jamais persistés
// comme second score public.
export function applyFinalScore(analyseCanonique) {
  const criteresNotes = extractCriteresNotes(analyseCanonique.analyse_par_criteres);
  const ajustementJuridique = analyseCanonique.qualification_juridique.ajustement_juridique;
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
    notationDetaillee,
    audit: { sommeInterne, ajustementJuridique, scoreTotal },
  };
}
