"use client";

import { useEffect, useRef, useState } from "react";
import ProgressBar from "./ProgressBar";
import { Icon } from "./ui";

// « Questions à poser » (onglet Synthèse) : questions d'interview générées avec
// l'analyse, en deux blocs (essentielles, difficiles) avec justification,
// sources associées, relance dépliable et copie. « Préparer une interview
// complète » étoffe la liste à la demande (route dédiée : ni score ni
// affirmations ne sont regénérés).

const GENERATION_TIMEOUT_MS = 100_000;

const INTERVIEW_MESSAGES = [
  "Relecture de l'analyse…",
  "Repérage des points sensibles…",
  "Rédaction des questions…",
  "Choix des relances…",
  "Finalisation…",
];

// Adresses cliquables : http(s) uniquement (double sécurité à l'affichage)
function safeHref(url) {
  return typeof url === "string" && /^https?:\/\/\S+$/i.test(url) ? url : null;
}

// Copie de secours pour les contextes sans API Presse-papiers moderne
function legacyCopy(text) {
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  const ok = document.execCommand("copy");
  document.body.removeChild(area);
  if (!ok) throw new Error("copie impossible");
}

function CopyButton({ text, label }) {
  const [state, setState] = useState("idle"); // idle | copied | failed
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
      else legacyCopy(text);
      setState("copied");
    } catch {
      setState("failed");
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 1800);
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={label}
      title={state === "copied" ? "Copié" : state === "failed" ? "Copie impossible" : label}
      className={`shrink-0 rounded-md p-1.5 transition-colors hover:bg-zinc-100 ${
        state === "copied" ? "text-emerald-600" : state === "failed" ? "text-red-500" : "text-zinc-400 hover:text-zinc-700"
      }`}
    >
      <Icon name={state === "copied" ? "check" : "copy"} className="h-4 w-4" />
      <span className="sr-only" aria-live="polite">
        {state === "copied" ? "Copié" : state === "failed" ? "Copie impossible" : ""}
      </span>
    </button>
  );
}

function QuestionItem({ number, question, sources }) {
  const [open, setOpen] = useState(false);
  const [relanceOpen, setRelanceOpen] = useState(false);
  const linked = question.sources.map((id) => sources.find((source) => source.id === id)).filter(Boolean);

  return (
    <li className="rounded-xl border border-zinc-200 bg-white">
      {/* Mobile : numéro + texte, puis les actions sur une ligne dessous ; à partir de sm : tout sur une ligne */}
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 gap-y-1 p-3 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
        <span
          aria-hidden="true"
          className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-600"
        >
          {number}
        </span>
        <div className="min-w-0 flex-1">
          {question.angle && (
            <span className="mb-1 inline-block rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] font-medium text-zinc-500">
              {question.angle}
            </span>
          )}
          <p className="text-sm font-medium leading-snug text-zinc-900">{question.texte}</p>
          {question.justification && <p className="mt-1 text-xs leading-relaxed text-zinc-500">{question.justification}</p>}
        </div>
        <div className="col-start-2 flex items-center gap-1 sm:col-start-auto">
          <span
            className={`mr-1 shrink-0 whitespace-nowrap text-xs ${linked.length > 0 ? "text-zinc-500" : "text-zinc-300"}`}
          >
            {linked.length > 0 ? `${linked.length} ${linked.length > 1 ? "sources" : "source"}` : "Sans source"}
          </span>
          {linked.length > 0 && (
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open}
              aria-label={open ? "Masquer les sources de la question" : "Afficher les sources de la question"}
              className="shrink-0 rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
            >
              <Icon name="chevronDown" className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
          )}
          <CopyButton text={question.texte} label="Copier la question" />
        </div>
      </div>

      {open && linked.length > 0 && (
        <ul className="flex flex-col gap-1 border-t border-zinc-100 px-3 py-2 pl-[52px] text-xs text-zinc-600">
          {linked.map((source) => {
            const href = safeHref(source.url);
            return (
              <li key={source.id}>
                {source.nom}
                {source.date ? ` (${source.date})` : ""}
                {href && (
                  <>
                    {" · "}
                    <a href={href} target="_blank" rel="noopener noreferrer nofollow" className="text-indigo-600 hover:underline">
                      Ouvrir
                    </a>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {question.relance && (
        <div className="px-3 pb-3 pl-[52px]">
          <button
            type="button"
            onClick={() => setRelanceOpen((value) => !value)}
            aria-expanded={relanceOpen}
            className="text-xs font-medium text-indigo-600 hover:underline"
          >
            {relanceOpen ? "− Relance proposée" : "+ Relance proposée"}
          </button>
          {relanceOpen && (
            <div className="mt-2 flex items-start gap-2 rounded-lg bg-zinc-50 px-3 py-2.5">
              <p className="min-w-0 flex-1 text-sm leading-snug text-zinc-700">{question.relance}</p>
              <CopyButton text={question.relance} label="Copier la relance" />
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function QuestionBlock({ icon, titre, description, questions, sources, tone, keyPrefix }) {
  if (questions.length === 0) return null;
  return (
    <section className={`rounded-xl p-3 sm:p-4 ${tone}`}>
      <h3 className="flex items-center gap-2 text-sm font-bold text-zinc-900">
        <Icon name={icon} className="h-4 w-4 text-zinc-500" />
        {titre} ({questions.length})
      </h3>
      <p className="mt-0.5 text-xs text-zinc-500">{description}</p>
      <ol className="mt-3 flex flex-col gap-2">
        {questions.map((question, index) => (
          <QuestionItem key={`${keyPrefix}-${index}`} number={index + 1} question={question} sources={sources} />
        ))}
      </ol>
    </section>
  );
}

export default function InterviewQuestions({ analyseId, initial, sources }) {
  const [questions, setQuestions] = useState(initial);
  const [generating, setGenerating] = useState(false);
  const [pending, setPending] = useState(null); // résultat reçu, affiché une fois la barre à 100 %
  const [error, setError] = useState(null);

  const total = questions.essentielles.length + questions.difficiles.length;
  const prefix = questions.etendu ? "complet" : "base";

  async function generate() {
    setError(null);
    setPending(null);
    setGenerating(true);

    // Délai maximal : sans réponse, on arrête la barre et on affiche une erreur
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), GENERATION_TIMEOUT_MS);
    try {
      const response = await fetch(`/api/live/analyses/${analyseId}/interview`, {
        method: "POST",
        signal: controller.signal,
      });
      if (response.status === 401) {
        window.location.href = "/live/login";
        return;
      }
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.questions) {
        setError(data?.error ?? "La préparation de l'interview a échoué. Réessayez.");
        setGenerating(false);
        return;
      }
      setPending(data.questions);
    } catch (caught) {
      setError(
        caught?.name === "AbortError"
          ? "La préparation de l'interview prend trop de temps. Réessayez."
          : "Connexion impossible. Vérifiez votre réseau et réessayez.",
      );
      setGenerating(false);
    } finally {
      clearTimeout(timer);
    }
  }

  function handleFinished() {
    setQuestions(pending);
    setPending(null);
    setGenerating(false);
  }

  return (
    <section aria-labelledby="questions-a-poser" className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="questions-a-poser" className="text-lg font-bold text-zinc-900">
            Questions à poser
          </h2>
          <p className="mt-0.5 text-sm text-zinc-500">
            {total > 0
              ? `${total} ${total > 1 ? "questions générées" : "question générée"} à partir de l'analyse`
              : "Aucune question générée pour le moment"}
          </p>
        </div>
        {!generating && !questions.etendu && (
          <button
            type="button"
            onClick={generate}
            className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50"
          >
            Préparer une interview complète
            <Icon name="arrowRight" className="h-4 w-4" />
          </button>
        )}
        {questions.etendu && !generating && (
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            Interview complète
          </span>
        )}
      </div>

      {generating && (
        <div className="mt-4">
          <ProgressBar
            label="Préparation de l'interview"
            messages={INTERVIEW_MESSAGES}
            finished={pending !== null}
            onFinished={handleFinished}
          />
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}

      {total === 0 ? (
        !generating && (
          <p className="mt-4 rounded-lg border border-dashed border-zinc-300 px-4 py-4 text-sm leading-relaxed text-zinc-500">
            {
              "Aucune question n'est disponible pour cette analyse (réalisée avant l'ajout des questions, ou aucune n'a pu être produite). Utilisez « Préparer une interview complète » pour les générer maintenant."
            }
          </p>
        )
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          <QuestionBlock
            icon="transcript"
            titre="Questions essentielles"
            description="Pour obtenir des précisions et mieux comprendre la mesure."
            questions={questions.essentielles}
            sources={sources}
            tone="bg-zinc-50"
            keyPrefix={`${prefix}-e`}
          />
          <QuestionBlock
            icon="alert"
            titre="Questions difficiles"
            description="Pour approfondir les zones d'incertitude et les points sensibles."
            questions={questions.difficiles}
            sources={sources}
            tone="bg-indigo-50/60"
            keyPrefix={`${prefix}-d`}
          />
        </div>
      )}
    </section>
  );
}
