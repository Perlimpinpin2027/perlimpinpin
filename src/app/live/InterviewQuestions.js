"use client";

import { useEffect, useRef, useState } from "react";
import ProgressBar from "./ProgressBar";
import { GO_CARD, Icon } from "./ui";
import { loginUrl } from "@/lib/live-redirect";

// « Questions légitimes » (page d'une analyse) : questions d'interview générées
// avec l'analyse, numérotées (essentielles puis difficiles) avec justification,
// lien vers la source, relance dépliable et copie. « Préparer une interview
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
  const [relanceOpen, setRelanceOpen] = useState(false);
  const linked = question.sources.map((id) => sources.find((source) => source.id === id)).filter(Boolean);
  // « Voir la source » : première source liée qui a une adresse ouvrable
  const premiere = linked.find((source) => safeHref(source.url));
  const autres = linked.filter((source) => source !== premiere);

  return (
    <li className="group flex items-start gap-4 py-4">
      <span
        aria-hidden="true"
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-50 text-lg font-bold tabular-nums text-blue-600"
      >
        {String(number).padStart(2, "0")}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <p className="min-w-0 flex-1 text-[15px] font-semibold leading-snug text-zinc-900">{question.texte}</p>
          <span className="-mr-1.5 -mt-1 opacity-60 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            <CopyButton text={question.texte} label="Copier la question" />
          </span>
        </div>
        {question.justification && (
          <p className="mt-1 text-sm leading-relaxed text-zinc-500">{question.justification}</p>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
          {premiere && (
            <a
              href={safeHref(premiere.url)}
              target="_blank"
              rel="noopener noreferrer nofollow"
              title={premiere.nom}
              className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
            >
              Voir la source
              <Icon name="arrowRight" className="h-4 w-4" />
            </a>
          )}
          {autres.length > 0 && (
            <span className="text-xs text-zinc-400" title={autres.map((source) => source.nom).join(" · ")}>
              {premiere ? "+ " : ""}
              {autres.length} {autres.length > 1 ? "sources" : "source"}
              {premiere ? "" : " (sans lien)"}
            </span>
          )}
          {question.relance && (
            <button
              type="button"
              onClick={() => setRelanceOpen((value) => !value)}
              aria-expanded={relanceOpen}
              className="text-sm text-zinc-500 hover:text-zinc-900 hover:underline"
            >
              {relanceOpen ? "− Relance proposée" : "+ Relance proposée"}
            </button>
          )}
        </div>
        {question.relance && relanceOpen && (
          <div className="mt-2 flex items-start gap-2 rounded-xl bg-white px-3 py-2.5">
            <p className="min-w-0 flex-1 text-sm leading-snug text-zinc-700">{question.relance}</p>
            <CopyButton text={question.relance} label="Copier la relance" />
          </div>
        )}
      </div>
    </li>
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
        window.location.href = loginUrl(window.location.pathname + window.location.search);
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

  // Numérotation continue : essentielles puis difficiles (séparées par un intertitre)
  const essentielles = questions.essentielles;
  const difficiles = questions.difficiles;

  return (
    <section aria-labelledby="questions-a-poser" className={`${GO_CARD} p-6`}>
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="questions-a-poser" className="text-2xl font-bold tracking-tight text-zinc-900">
          Questions légitimes
        </h2>
        <p className="shrink-0 text-sm text-zinc-500">
          {total} {total > 1 ? "questions" : "question"}
        </p>
      </div>

      {total === 0 ? (
        !generating && (
          <p className="mt-4 rounded-xl border border-dashed border-zinc-300 px-4 py-4 text-sm leading-relaxed text-zinc-500">
            {
              "Aucune question n'est disponible pour cette analyse (réalisée avant l'ajout des questions, ou aucune n'a pu être produite). Utilisez « Préparer une interview complète » pour les générer maintenant."
            }
          </p>
        )
      ) : (
        <>
          <ol className="mt-1 divide-y divide-[#e6e4de]">
            {essentielles.map((question, index) => (
              <QuestionItem key={`${prefix}-e-${index}`} number={index + 1} question={question} sources={sources} />
            ))}
          </ol>
          {difficiles.length > 0 && (
            <>
              <h3 className="mt-2 flex items-center gap-2 border-t border-[#e6e4de] pt-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                <Icon name="alert" className="h-4 w-4" />
                Questions difficiles
              </h3>
              <ol className="divide-y divide-[#e6e4de]">
                {difficiles.map((question, index) => (
                  <QuestionItem
                    key={`${prefix}-d-${index}`}
                    number={essentielles.length + index + 1}
                    question={question}
                    sources={sources}
                  />
                ))}
              </ol>
            </>
          )}
        </>
      )}

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

      <div className="mt-4 border-t border-[#e6e4de] pt-4">
        {!generating && !questions.etendu && (
          <button
            type="button"
            onClick={generate}
            className="inline-flex items-center gap-2 rounded-full border border-[#e6e4de] bg-white px-4 py-2 text-sm font-medium text-zinc-800 transition-colors hover:border-zinc-300"
          >
            <Icon name="microphone" className="h-4 w-4" />
            Préparer une interview complète
          </button>
        )}
        {questions.etendu && !generating && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            <Icon name="check" className="h-3.5 w-3.5" />
            Interview complète
          </span>
        )}
      </div>
    </section>
  );
}
