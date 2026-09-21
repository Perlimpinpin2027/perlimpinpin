import { z } from "zod";

// Questions d'interview d'une analyse live : { essentielles, difficiles }.
// Générées avec l'analyse (Phase 8), puis étoffées à la demande par la route
// « interview complète ». Toute cette partie est NON critique : absente ou
// invalide, elle ne fait jamais échouer l'analyse (voir live-analyse.js).

// Limites de la génération avec l'analyse et de l'interview complète.
export const BASE_LIMITS = { essentielles: 4, difficiles: 4, relances: 2 };
export const FULL_LIMITS = { essentielles: 8, difficiles: 8, relances: 5 };

// Vocabulaire d'évaluation interne qui ne doit JAMAIS apparaître dans une
// question de journaliste (« votre score en opérationnalité est faible »…). Le
// prompt l'interdit ; ce filtre le garantit. Volontairement étroit : « critère »
// ou « note » seuls restent possibles dans une question naturelle.
const INTERNAL_JARGON =
  /op[ée]rationnalit[ée]|bar[èe]me|\bscore\b|sous-crit[èe]re|\bnotation\b|qualification (juridique|budg[ée]taire)|plafond appliqu[ée]|degr[ée] de pr[ée]paration|effets? rebonds? (&|et) externalit[ée]s|alignement (&|et) logique|perlimpinpin|pipeline|m[ée]thodologie interne/i;

export function hasInternalJargon(text) {
  return typeof text === "string" && INTERNAL_JARGON.test(text);
}

// Tableau tolérant : un élément invalide est ignoré (et non la liste entière).
function lenientList(itemSchema) {
  return z
    .array(z.unknown())
    .catch([])
    .transform((items) =>
      items.flatMap((item) => {
        const result = itemSchema.safeParse(item);
        return result.success ? [result.data] : [];
      }),
    );
}

const optionalText = (max) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((value) => value || null)
    .catch(null);

const QuestionSchema = z.object({
  texte: z.string().trim().min(8).max(400),
  // Pourquoi cette question se pose (« Le financement n'est pas détaillé… »)
  justification: z.string().trim().max(300).catch(""),
  // Identifiants de la liste de sources de l'analyse
  sources: z.array(z.number().int()).catch([]),
  // Question de suivi si la réponse est évasive (questions difficiles seulement)
  relance: optionalText(400),
  // Thème court de l'interview complète (« Financement », « Calendrier »…)
  angle: optionalText(40),
});

// Une question est écartée si un de ses textes emploie le jargon interne.
// Une relance au jargon interne est simplement retirée.
function cleanQuestion(question) {
  if (hasInternalJargon(question.texte) || hasInternalJargon(question.justification)) return null;
  return { ...question, relance: hasInternalJargon(question.relance) ? null : question.relance };
}

// Schéma de la structure, avec limites de longueur des listes. Règles :
//   - relances : jamais sur les questions essentielles, et seulement sur
//     quelques questions difficiles (pas systématique) ;
//   - questions au jargon interne : écartées.
export function questionsSchema(limits) {
  return z
    .object({
      essentielles: lenientList(QuestionSchema),
      difficiles: lenientList(QuestionSchema),
    })
    .transform((data) => {
      const essentielles = data.essentielles
        .map(cleanQuestion)
        .filter(Boolean)
        .slice(0, limits.essentielles)
        .map((question) => ({ ...question, relance: null }));
      let relancesRestantes = limits.relances;
      const difficiles = data.difficiles
        .map(cleanQuestion)
        .filter(Boolean)
        .slice(0, limits.difficiles)
        .map((question) => {
          if (!question.relance) return question;
          if (relancesRestantes <= 0) return { ...question, relance: null };
          relancesRestantes -= 1;
          return question;
        });
      return { essentielles, difficiles };
    });
}

// Une question ne référence que des sources qui existent dans l'analyse.
export function restrictQuestionSources(questions, validIds) {
  const ids = validIds instanceof Set ? validIds : new Set(validIds);
  const restrict = (question) => ({
    ...question,
    sources: [...new Set(question.sources)].filter((id) => ids.has(id)),
  });
  return {
    essentielles: questions.essentielles.map(restrict),
    difficiles: questions.difficiles.map(restrict),
  };
}

export const EMPTY_QUESTIONS = { essentielles: [], difficiles: [] };

export function countQuestions(questions) {
  return (questions?.essentielles?.length ?? 0) + (questions?.difficiles?.length ?? 0);
}

// Relit la structure stockée en base (JSON libre) : forme inconnue ou absente =>
// listes vides, jamais d'exception. `etendu` indique une interview complète.
const StoredQuestionsSchema = z.object({
  essentielles: lenientList(QuestionSchema),
  difficiles: lenientList(QuestionSchema),
  etendu: z.boolean().catch(false),
});

export function parseStoredQuestions(json) {
  const result = StoredQuestionsSchema.safeParse(json);
  return result.success ? result.data : { ...EMPTY_QUESTIONS, etendu: false };
}
