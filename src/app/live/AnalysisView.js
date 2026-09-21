"use client";

import { useState } from "react";
import { getScoreBadge } from "@/lib/score";
import { axisLevels, levelTone } from "@/lib/live-axes";
import InterviewQuestions from "./InterviewQuestions";
import { MesureCard } from "./MesureDetail";
import { Icon, SCORE_BAR_CLASS, VerdictDot, VerdictLabel } from "./ui";

// Corps de la page d'une analyse : trois onglets (Synthèse, Affirmations,
// Sources). Reçoit le détail déjà chargé côté serveur (getLiveAnalyseDetail).
// Une analyse antérieure à la structure enrichie (analyse.enrichi === false)
// s'affiche en version simplifiée, sans affirmations ni sources.

const LEGACY_NOTICE =
  "Cette analyse a été réalisée avant l'ajout des affirmations, des sources et des synthèses par axe : ces volets ne sont pas disponibles. Relancez l'analyse de la déclaration pour les obtenir.";

// N'ouvre que des liens http(s) (les adresses sont déjà filtrées à l'analyse ;
// double sécurité à l'affichage).
function safeHref(url) {
  return typeof url === "string" && /^https?:\/\/\S+$/i.test(url) ? url : null;
}

const TONE_STYLES = {
  red: "bg-red-50 text-red-500",
  amber: "bg-amber-50 text-amber-600",
  green: "bg-emerald-50 text-emerald-600",
  neutral: "bg-zinc-100 text-zinc-400",
};

const CONFIANCE_DOT = {
  "élevé": "bg-emerald-500",
  moyen: "bg-amber-400",
  faible: "bg-red-500",
};

const AXES = [
  { key: "chiffrage", label: "Chiffrage", icon: "banknotes" },
  { key: "faisabilite", label: "Faisabilité", icon: "scale" },
  { key: "impact", label: "Impact", icon: "users" },
];

function Notice({ children }) {
  return (
    <p className="rounded-lg border border-dashed border-zinc-300 px-4 py-4 text-sm leading-relaxed text-zinc-500">
      {children}
    </p>
  );
}

function SourceChips({ ids, sources }) {
  const linked = ids.map((id) => sources.find((source) => source.id === id)).filter(Boolean);
  if (linked.length === 0) return null;
  return (
    <ul className="mt-1.5 flex flex-wrap gap-1.5">
      {linked.map((source) => (
        <li key={source.id} className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
          {source.nom}
        </li>
      ))}
    </ul>
  );
}

// --- Synthèse -------------------------------------------------------------------

function SynthesePanel({ analyse, onShowAffirmations }) {
  const [expanded, setExpanded] = useState(false);
  const badge = getScoreBadge(analyse.score);
  const levels = axisLevels(analyse.mesures);
  const resume = analyse.syntheseGlobale ?? analyse.mesures[0]?.verdict_court ?? null;
  const hasAxes = AXES.some((axe) => analyse.syntheses[axe.key]);
  const apercu = analyse.affirmations.slice(0, 3);

  return (
    <div className="flex flex-col gap-5">
      {analyse.mode === "approfondie" ? (
        // Analyse avec recherche web : pas de bandeau « estimation préliminaire », le
        // niveau de confiance en tient lieu.
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-zinc-200 bg-white/70 px-4 py-3 text-sm text-zinc-600">
          <strong className="text-zinc-800">Analyse approfondie.</strong>
          <span>Réalisée avec une recherche de sources externes.</span>
          {analyse.confiance && (
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${CONFIANCE_DOT[analyse.confiance] ?? "bg-zinc-300"}`} />
              Niveau de confiance : <strong className="text-zinc-800">{analyse.confiance}</strong>
            </span>
          )}
        </p>
      ) : (
        <p className="rounded-lg border border-zinc-200 bg-white/70 px-4 py-3 text-sm text-zinc-600">
          <strong className="text-zinc-800">Estimation préliminaire.</strong>{" "}
          {"Réalisée sans recherche externe, à partir de la seule déclaration : à vérifier avant toute diffusion."}
        </p>
      )}

      <section aria-labelledby="evaluation-globale" className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6">
        <h2 id="evaluation-globale" className="text-lg font-bold text-zinc-900">
          Évaluation globale
        </h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:gap-8">
          <div>
            <div className="flex items-center gap-4">
              <p className="text-5xl font-bold leading-none text-zinc-900">
                {analyse.score}
                <span className="text-lg font-normal text-zinc-400">/100</span>
              </p>
              <span className={`rounded-full px-4 py-1.5 text-base font-semibold ${badge.badgeClass}`}>{badge.label}</span>
            </div>
            <div
              role="progressbar"
              aria-label="Score global"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={analyse.score}
              className="mt-4 h-2 w-full overflow-hidden rounded-full bg-zinc-100"
            >
              <div
                className={`h-full rounded-full ${SCORE_BAR_CLASS[badge.color] ?? "bg-zinc-400"}`}
                style={{ width: `${Math.min(100, Math.max(0, analyse.score))}%` }}
              />
            </div>
            {analyse.nbMesures > 1 && (
              <p className="mt-2 text-xs text-zinc-400">Score moyen de {analyse.nbMesures} mesures analysées.</p>
            )}
          </div>
          <div className="text-sm leading-relaxed text-zinc-600">
            {resume && <p>{resume}</p>}
            <button
              type="button"
              onClick={() => setExpanded((open) => !open)}
              aria-expanded={expanded}
              aria-controls="analyse-complete"
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:underline"
            >
              {expanded ? "Masquer l'analyse complète" : "Lire l'analyse complète"}
              <Icon name="arrowRight" className={`h-4 w-4 transition-transform ${expanded ? "rotate-90" : ""}`} />
            </button>
          </div>
        </div>

        {expanded && (
          <div id="analyse-complete" className="mt-6 flex flex-col gap-4 border-t border-zinc-200 pt-6">
            {analyse.mesures.length === 0 ? (
              <Notice>{"Le détail par critère n'est pas disponible pour cette analyse."}</Notice>
            ) : (
              analyse.mesures.map((mesure, index) => <MesureCard key={index} mesure={mesure} index={index} />)
            )}
            {analyse.remarque && <p className="text-sm text-zinc-500">{analyse.remarque}</p>}
          </div>
        )}
      </section>

      {hasAxes ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {AXES.map((axe) => {
            const tone = levels ? levelTone(levels[axe.key]) : "neutral";
            return (
              <section key={axe.key} className="rounded-xl border border-zinc-200 bg-white p-4">
                <div className="flex items-center gap-2.5">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${TONE_STYLES[tone]}`}>
                    <Icon name={axe.icon} className="h-4 w-4" />
                  </span>
                  <h3 className="text-sm font-semibold text-zinc-900">{axe.label}</h3>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                  {analyse.syntheses[axe.key] ?? "Non renseigné."}
                </p>
              </section>
            );
          })}
        </div>
      ) : (
        !analyse.enrichi && <Notice>{LEGACY_NOTICE}</Notice>
      )}

      <InterviewQuestions analyseId={analyse.id} initial={analyse.questions} sources={analyse.sources} />

      {analyse.enrichi && (
        <section aria-labelledby="apercu-affirmations" className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="apercu-affirmations" className="text-lg font-bold text-zinc-900">
              Affirmations analysées ({analyse.affirmations.length})
            </h2>
            {analyse.affirmations.length > 0 && (
              <button
                type="button"
                onClick={onShowAffirmations}
                className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:underline"
              >
                Voir toutes
                <Icon name="arrowRight" className="h-4 w-4" />
              </button>
            )}
          </div>
          {apercu.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">{"Aucune affirmation vérifiable n'a été extraite de cette déclaration."}</p>
          ) : (
            <ul className="mt-3 divide-y divide-zinc-100">
              {apercu.map((affirmation, index) => (
                <li key={index} className="flex items-start gap-3 py-3">
                  <VerdictDot verdict={affirmation.verdict} />
                  <p className="min-w-0 flex-1 text-sm text-zinc-800">{`« ${affirmation.texte} »`}</p>
                  <VerdictLabel verdict={affirmation.verdict} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

// --- Affirmations ---------------------------------------------------------------

function AffirmationsPanel({ analyse }) {
  if (!analyse.enrichi) return <Notice>{LEGACY_NOTICE}</Notice>;
  if (analyse.affirmations.length === 0) {
    return <Notice>{"Aucune affirmation vérifiable n'a été extraite de cette déclaration."}</Notice>;
  }
  return (
    <ul className="flex flex-col gap-3">
      {analyse.affirmations.map((affirmation, index) => (
        <li key={index} className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="flex items-start gap-3">
            <VerdictDot verdict={affirmation.verdict} />
            <p className="min-w-0 flex-1 text-sm font-medium text-zinc-900">{`« ${affirmation.texte} »`}</p>
            <VerdictLabel verdict={affirmation.verdict} />
          </div>
          <div className="pl-[22px]">
            {affirmation.sources.length > 0 ? (
              <SourceChips ids={affirmation.sources} sources={analyse.sources} />
            ) : (
              <p className="mt-1.5 text-xs text-zinc-400">Aucune source identifiée pour cette affirmation.</p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

// --- Sources ----------------------------------------------------------------------

function SourcesPanel({ analyse }) {
  if (!analyse.enrichi) return <Notice>{LEGACY_NOTICE}</Notice>;
  return (
    <div className="flex flex-col gap-4">
      <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900">
        {analyse.mode === "approfondie"
          ? "Sources trouvées par la recherche web lors de l'analyse. Une source de plaidoyer n'est jamais retenue seule pour appuyer un fait. Relisez les sources clés avant toute diffusion."
          : "Pistes de vérification issues des connaissances de l'analyse (institutions, textes officiels) : elle n'effectue aucune recherche web et ne lit pas ces sources. À consulter et à vérifier avant toute diffusion."}
      </p>
      {analyse.sources.length === 0 ? (
        <Notice>
          {analyse.mode === "approfondie"
            ? "La recherche n'a pas permis d'identifier de source fiable pour cette déclaration. Vérifiez les chiffres et les textes cités auprès de sources officielles."
            : "Aucune source n'a pu être identifiée avec certitude pour cette déclaration. Vérifiez les chiffres et les textes cités auprès de sources officielles."}
        </Notice>
      ) : (
        <ol className="flex flex-col gap-2">
          {[...analyse.sources]
            .sort((a, b) => a.id - b.id)
            .map((source) => {
              const href = safeHref(source.url);
              return (
                <li key={source.id} className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-white p-4">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-500">
                    {source.id}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zinc-900">{source.nom}</p>
                    <p className="mt-0.5 text-xs text-zinc-400">{source.date ?? "Date non précisée"}</p>
                    {href && (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="mt-1 inline-block break-all text-xs text-indigo-600 hover:underline"
                      >
                        {href}
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
        </ol>
      )}
    </div>
  );
}

// --- Onglets ---------------------------------------------------------------------

export default function AnalysisView({ analyse }) {
  const [tab, setTab] = useState("synthese");

  const tabs = [
    { id: "synthese", label: "Synthèse", icon: "clipboard" },
    {
      id: "affirmations",
      label: "Affirmations",
      icon: "pencil",
      count: analyse.enrichi ? analyse.affirmations.length : null,
    },
    { id: "sources", label: "Sources", icon: "document", count: analyse.enrichi ? analyse.sources.length : null },
  ];

  return (
    <div>
      <div role="tablist" aria-label="Volets de l'analyse" className="flex gap-1 overflow-x-auto border-b border-zinc-200">
        {tabs.map((item) => {
          const selected = tab === item.id;
          return (
            <button
              key={item.id}
              id={`tab-${item.id}`}
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls={`panel-${item.id}`}
              onClick={() => setTab(item.id)}
              className={`-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-3 text-sm font-medium transition-colors sm:gap-2 sm:px-4 ${
                selected
                  ? "border-zinc-900 text-zinc-900"
                  : "border-transparent text-zinc-500 hover:text-zinc-800"
              }`}
            >
              <Icon name={item.icon} className="hidden h-4 w-4 sm:block" />
              {item.label}
              {item.count !== null && item.count !== undefined && (
                <span className="text-zinc-400">({item.count})</span>
              )}
            </button>
          );
        })}
      </div>

      <div id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} className="mt-5">
        {tab === "synthese" && (
          <SynthesePanel analyse={analyse} onShowAffirmations={() => setTab("affirmations")} />
        )}
        {tab === "affirmations" && <AffirmationsPanel analyse={analyse} />}
        {tab === "sources" && <SourcesPanel analyse={analyse} />}
      </div>
    </div>
  );
}
