import { z } from "zod";

// Barème 2026 du pipeline à 3 étapes (voir data/prompt-methodologie.md) : 5
// critères SANS malus — Opérationnalité & Moyens (30, décomposée en 3
// sous-composantes juridique/budgétaire/moyens humains notées /10 chacune),
// Efficacité (30), Effets rebonds & Externalités (20), Degré de préparation
// (10), Alignement & Logique globale (10). Le système de malus juridique
// bonus-malus (-30..+5, "ajustement_juridique") est entièrement supprimé :
// la dimension juridique est désormais une sous-composante additive de
// l'Opérationnalité & Moyens, avec une RÈGLE DE PLAFOND dédiée (voir
// checkNotationCoherence) plutôt qu'un ajustement séparé du score total.
//
// "L'analyse, les notes, la qualification juridique, l'arbitrage et le
// calcul final restent effectués par les IA. Le code orchestre les appels,
// valide le JSON, gère la résilience et stocke les résultats" (voir en-tête
// de data/prompt-methodologie.md). Ce module ne recalcule donc JAMAIS
// score_total à la place du modèle — il valide uniquement la STRUCTURE
// (types, bornes, énumérations) pour déclencher une réparation ciblée en cas
// de JSON malformé, et expose une vérification de cohérence arithmétique à
// part (checkNotationCoherence) destinée à un simple avertissement en log,
// jamais à une correction silencieuse.

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

// --- Qualifications ------------------------------------------------------------
// Chaque critère et sous-critère porte une qualification choisie AVANT la
// note numérique (voir data/prompt-methodologie.md, "BARÈME PRINCIPAL").
const QUALIFICATION = ["SOLIDE", "INCERTAIN", "FRAGILE"];

// --- mesure_vers_objectif (nouveau bloc obligatoire, étape 1 point 1bis) ----
// Liste fermée des 12 domaines couverts par data/objectifs-de-reference.md —
// doit rester synchronisée avec ce document et avec la liste de
// data/prompt-methodologie.md (point 1bis).
export const CATEGORIES_OBJECTIF = [
  "Retraites",
  "Santé",
  "Emploi et chômage",
  "Éducation",
  "Énergie et climat",
  "Logement",
  "Alimentation et agriculture",
  "Fiscalité et pouvoir d'achat",
  "Dette et finances publiques",
  "Immigration",
  "Sécurité et justice",
  "Numérique et intelligence artificielle",
];

const MesureVersObjectifSchema = z.object({
  objectif_court: z.string().min(1),
  categorie_objectif: z.enum(CATEGORIES_OBJECTIF).nullable(),
  objectif_vise: z.string().min(1),
  mecanisme_propose: z.string().min(1),
  lien_causal: z.enum(["direct", "indirect", "faible_ou_absent"]),
});

// --- notation_detaillee ---------------------------------------------------------
// Sous-composantes de l'Opérationnalité & Moyens (1a/1b/1c), chacune 0-10.
const PLAFOND_DECLENCHEURS = ["juridique", "budgetaire", "moyens_humains"];

const NotationDetailleeSchema = z.object({
  operationnalite_juridique: z.number().int().min(0).max(10),
  qualification_juridique: z.enum(QUALIFICATION),
  operationnalite_budgetaire: z.number().int().min(0).max(10),
  qualification_budgetaire: z.enum(QUALIFICATION),
  operationnalite_moyens_humains: z.number().int().min(0).max(10),
  qualification_moyens_humains: z.enum(QUALIFICATION),
  operationnalite_moyens_total: z.number().int().min(0).max(30),
  plafond_applique: z.boolean(),
  plafond_declencheur: z.enum(PLAFOND_DECLENCHEURS).nullable(),
  efficacite: z.number().int().min(0).max(30),
  qualification_efficacite: z.enum(QUALIFICATION),
  effets_rebonds_externalites: z.number().int().min(0).max(20),
  qualification_effets_rebonds: z.enum(QUALIFICATION),
  degre_preparation: z.number().int().min(0).max(10),
  qualification_preparation: z.enum(QUALIFICATION),
  alignement_logique: z.number().int().min(0).max(10),
  qualification_alignement: z.enum(QUALIFICATION),
  score_total: z.number().int().min(0).max(100),
  appreciation: z.string().min(1),
});

// Sous-composante la plus basse parmi celles qualifiées FRAGILE (< 3/10) —
// c'est celle-là que plafond_declencheur doit identifier en cas d'égalité
// ou de FRAGILE multiples (voir CALCUL, étape 2, dans
// data/prompt-methodologie.md : "si plusieurs sous-composantes sont
// FRAGILE, indiquer celle dont le score est le plus bas").
function computePlafondDeclencheurAttendu({
  operationnalite_juridique,
  operationnalite_budgetaire,
  operationnalite_moyens_humains,
}) {
  const sousComposantes = [
    { nom: "juridique", note: operationnalite_juridique },
    { nom: "budgetaire", note: operationnalite_budgetaire },
    { nom: "moyens_humains", note: operationnalite_moyens_humains },
  ];
  const fragiles = sousComposantes.filter((item) => item.note < 3);
  if (fragiles.length === 0) return null;
  return fragiles.reduce((lowest, item) => (item.note < lowest.note ? item : lowest)).nom;
}

// Revérifie la cohérence arithmétique de notation_detaillee (CALCUL, voir
// data/prompt-methodologie.md) sans jamais écraser les valeurs produites
// par le modèle — voir l'en-tête de ce fichier. Retourne une liste d'écarts
// destinée uniquement à un log d'avertissement côté appelant (le message
// "INCOHÉRENCE DE CALCUL DÉTECTÉE" est affiché par l'appelant, voir
// scripts/analyze.js, warnNotationCoherence).
export function checkNotationCoherence(notation) {
  const errors = [];
  const {
    operationnalite_juridique,
    operationnalite_budgetaire,
    operationnalite_moyens_humains,
    operationnalite_moyens_total,
    plafond_applique,
    plafond_declencheur,
    efficacite,
    effets_rebonds_externalites,
    degre_preparation,
    alignement_logique,
    score_total,
  } = notation;

  // 1. operationnalite_moyens_total = somme des 3 sous-composantes
  const sousTotal = operationnalite_juridique + operationnalite_budgetaire + operationnalite_moyens_humains;

  // 2. RÈGLE DE PLAFOND
  const declencheurAttendu = computePlafondDeclencheurAttendu(notation);
  const plafondAppliqueAttendu = declencheurAttendu !== null;
  const totalOperationnaliteAttendu = plafondAppliqueAttendu ? Math.min(sousTotal, 10) : sousTotal;

  if (totalOperationnaliteAttendu !== operationnalite_moyens_total) {
    errors.push(
      `operationnalite_moyens_total incohérent : attendu ${totalOperationnaliteAttendu} (somme ${sousTotal}${plafondAppliqueAttendu ? ", plafonnée à 10 (règle de plafond)" : ""}), trouvé ${operationnalite_moyens_total}.`,
    );
  }
  if (plafondAppliqueAttendu !== plafond_applique) {
    errors.push(
      `plafond_applique incohérent : attendu ${plafondAppliqueAttendu} (sous-composante(s) FRAGILE : juridique=${operationnalite_juridique}, budgetaire=${operationnalite_budgetaire}, moyens_humains=${operationnalite_moyens_humains}), trouvé ${plafond_applique}.`,
    );
  }
  if (declencheurAttendu !== plafond_declencheur) {
    errors.push(
      `plafond_declencheur incohérent : attendu ${JSON.stringify(declencheurAttendu)}, trouvé ${JSON.stringify(plafond_declencheur)}.`,
    );
  }

  // 3. score_total = clamp(somme des 5 critères, 0, 100)
  const scoreAttendu = Math.max(
    0,
    Math.min(
      100,
      operationnalite_moyens_total + efficacite + effets_rebonds_externalites + degre_preparation + alignement_logique,
    ),
  );
  if (scoreAttendu !== score_total) {
    errors.push(
      `score_total incohérent : attendu ${scoreAttendu} (clamp(operationnalite_moyens_total + efficacite + effets_rebonds_externalites + degre_preparation + alignement_logique, 0, 100)), trouvé ${score_total}.`,
    );
  }

  const appreciationAttendue = computeAppreciation(score_total);
  if (notation.appreciation && notation.appreciation.toLowerCase() !== appreciationAttendue) {
    errors.push(
      `appreciation incohérente : score_total=${score_total} implique "${appreciationAttendue}", trouvé "${notation.appreciation}".`,
    );
  }

  return errors;
}

// --- Schémas étape 1 / fiche_complete (étape 3) -------------------------------
// Champs texte libre : parfois renvoyés en tableau de points par le modèle
// malgré la consigne — cf. toText() dans analyze.js, permissif ici aussi.
const TextOrArray = z.union([z.string(), z.array(z.string())]);

// Sections en accordéon (voir data/prompt-methodologie.md, "SECTIONS EN
// ACCORDÉON") : synthese = une phrase (≤20 mots visés côté prompt, 220
// caractères en garde-fou structurel ici — le prompt gère la longueur en
// mots, ce schéma ne fait que borner un excès manifeste), texte = contenu
// complet inchangé (toujours permissif chaîne/tableau, cf. TextOrArray).
const AccordionSectionSchema = z.object({
  synthese: z.string().min(1).max(220),
  texte: TextOrArray,
});

// Champs communs à l'étape 1 et à fiche_complete (étape 3, après arbitrage)
// — voir "FORMAT ÉTAPE 1 — JSON STRICT" dans data/prompt-methodologie.md.
// N'inclut PAS analyse_par_criteres (forme différente selon l'étape, voir
// plus bas) ni resume_court/phrase_teasing (absents de fiche_complete).
//
// impact_environnement et impact_temporel_et_sectoriel restent les deux
// seuls champs nullable de ce groupe (objet entier `null` si non
// applicable) — tous les autres, y compris contexte_programme/national/
// international qui l'étaient dans l'ancien format texte libre, sont
// désormais requis sous forme d'objet {synthese, texte} (voir la demande
// d'origine : seuls impact_environnement et impact_temporel_et_sectoriel
// sont annotés "si non null").
const champsCommunsEtape1 = {
  mesure_reformulee: AccordionSectionSchema,
  mesure_vers_objectif: MesureVersObjectifSchema,
  nature_et_existant: z.string().min(1),
  contexte_programme: AccordionSectionSchema,
  contexte_national: AccordionSectionSchema,
  contexte_international: AccordionSectionSchema,
  impact_environnement: AccordionSectionSchema.nullable(),
  analyse_longevites: AccordionSectionSchema,
  impact_temporel_et_sectoriel: AccordionSectionSchema.nullable(),
  ce_qui_est_etabli: AccordionSectionSchema,
  ce_qui_est_probable: AccordionSectionSchema,
  ce_qui_est_discutable: AccordionSectionSchema,
  ce_qui_est_inconnu: AccordionSectionSchema,
  angles_morts: AccordionSectionSchema,
  notation_detaillee: NotationDetailleeSchema,
  verdict_final: z.string().min(1),
  sources_utilisees: z.array(z.any()),
  niveau_de_confiance: z.string().min(1),
  limites: AccordionSectionSchema,
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
// de 5 objets, un par critère du barème (voir "FORMAT ÉTAPE 3 — JSON
// STRICT"), avec un note_max PROPRE à chaque critère (30/30/20/10/10) —
// plus un barème uniforme /25 comme dans l'ancien schéma. Seul l'objet
// "operationnalite_moyens" porte plafond_applique/plafond_declencheur (les
// 4 autres ne les incluent pas, voir le gabarit).
export const CRITERE_ETAPE3_KEYS = [
  "operationnalite_moyens",
  "efficacite",
  "effets_rebonds_externalites",
  "degre_preparation",
  "alignement_logique",
];

export const CRITERE_NOTE_MAX = {
  operationnalite_moyens: 30,
  efficacite: 30,
  effets_rebonds_externalites: 20,
  degre_preparation: 10,
  alignement_logique: 10,
};

const CritereEtape3Schema = z
  .object({
    critere: z.enum(CRITERE_ETAPE3_KEYS),
    titre: z.string().min(1),
    note: z.number().int().min(0).max(30).nullable(),
    note_max: z.number().int(),
    plafond_applique: z.boolean().optional(),
    plafond_declencheur: z.enum(PLAFOND_DECLENCHEURS).nullable().optional(),
    texte: z.string().min(1),
  })
  .refine((item) => item.note_max === CRITERE_NOTE_MAX[item.critere], (item) => ({
    message: `note_max (${item.note_max}) ne correspond pas au barème attendu pour "${item.critere}" (${CRITERE_NOTE_MAX[item.critere]}).`,
  }))
  .refine((item) => item.note === null || item.note <= item.note_max, (item) => ({
    message: `note (${item.note}) dépasse note_max (${item.note_max}) pour "${item.critere}".`,
  }));

const AnalyseParCriteresEtape3Schema = z
  .array(CritereEtape3Schema)
  .length(5, "analyse_par_criteres (étape 3) doit contenir exactement 5 objets, un par critère du barème.")
  .refine(
    (items) => {
      const seen = new Set(items.map((item) => item.critere));
      return seen.size === 5 && CRITERE_ETAPE3_KEYS.every((key) => seen.has(key));
    },
    {
      message: "analyse_par_criteres (étape 3) doit contenir exactement les 5 critères du barème, sans doublon.",
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
