"use client";

import { useState } from "react";
import { getScoreBadge } from "@/lib/score";
import { axisLevels, levelTone } from "@/lib/live-axes";
import InterviewQuestions from "./InterviewQuestions";
import { MesureCard } from "./MesureDetail";
import { GO_CARD, Icon, SCORE_BAR_CLASS, VerdictDot, VerdictPill } from "./ui";

// Corps de la page d'une analyse (refonte d'après la maquette) : carte score,
// résumé, puis deux colonnes « Les faits » (affirmations) et « Questions
// légitimes » (questions d'interview). Tout le reste (déclaration, axes, détail
// des mesures, sources, origine) est dans le panneau « Lire l'analyse
// détaillée ». Reçoit le détail déjà chargé côté serveur (getLiveAnalyseDetail).
// Une analyse antérieure à la structure enrichie (analyse.enrichi === false)
// s'affiche sans affirmations ni sources.
//
// `declaration` : bloc serveur (citation, vidéo, origine) affiché en tête du
// panneau détaillé.

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

// Nombre maximal de sources affichées sous un fait (les autres sont dans le panneau détaillé)
const SOURCES_PAR_FAIT = 2;

function Notice({ children }) {
  return (
    <p className="rounded-xl border border-dashed border-zinc-300 px-4 py-4 text-sm leading-relaxed text-zinc-500">
      {children}
    </p>
  );
}

// Lien vers une source : cliquable si l'adresse est http(s), texte simple sinon
function SourceLink({ source }) {
  const href = safeHref(source.url);
  const label = `${source.nom}${source.date ? ` (${source.date})` : ""}`;
  const content = (
    <>
      <Icon name="document" className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="min-w-0">{label}</span>
      {href && <Icon name="external" className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
    </>
  );
  return href ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="inline-flex items-start gap-1.5 text-sm text-blue-600 hover:underline"
    >
      {content}
    </a>
  ) : (
    <span className="inline-flex items-start gap-1.5 text-sm text-blue-600/80">{content}</span>
  );
}

// --- Carte score -----------------------------------------------------------------

// Barre découpée en trois segments, remplie jusqu'au score avec la couleur du palier
function SegmentedBar({ score, colorClass }) {
  const value = Math.min(100, Math.max(0, score));
  const segments = [0, 1, 2].map((index) => {
    const start = (index * 100) / 3;
    return Math.min(1, Math.max(0, (value - start) / (100 / 3)));
  });
  return (
    <div
      role="progressbar"
      aria-label="Score global"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={score}
      className="flex w-full gap-1 sm:w-80"
    >
      {segments.map((fill, index) => (
        <span key={index} className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-200/80">
          <span className={`block h-full rounded-full ${colorClass}`} style={{ width: `${fill * 100}%` }} />
        </span>
      ))}
    </div>
  );
}

function ScoreCard({ analyse }) {
  const badge = getScoreBadge(analyse.score);
  return (
    <section aria-label="Score de l'analyse" className={`${GO_CARD} px-6 py-5 sm:px-8`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <p className="font-sans text-6xl font-extrabold leading-none tracking-[-0.04em] text-zinc-900">
            {analyse.score}
            <span className="ml-1 text-2xl font-normal tracking-normal text-zinc-400">/100</span>
          </p>
          <span className={`rounded-full px-5 py-2 text-lg font-semibold ${badge.badgeClass}`}>{badge.label}</span>
        </div>
        <SegmentedBar score={analyse.score} colorClass={SCORE_BAR_CLASS[badge.color] ?? "bg-zinc-400"} />
      </div>

      {/* Nature de l'analyse : garde-fou toujours visible pour les journalistes */}
      <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-[#e6e4de] pt-3 text-sm text-zinc-600">
        {analyse.mode === "approfondie" ? (
          <>
            <strong className="font-semibold text-zinc-800">Analyse approfondie.</strong>
            <span>Réalisée avec une recherche de sources externes.</span>
            {analyse.confiance && (
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${CONFIANCE_DOT[analyse.confiance] ?? "bg-zinc-300"}`} />
                Niveau de confiance : <strong className="font-semibold text-zinc-800">{analyse.confiance}</strong>
              </span>
            )}
          </>
        ) : (
          <>
            <strong className="font-semibold text-amber-800">Estimation préliminaire.</strong>
            <span>Réalisée sans recherche externe, à partir de la seule déclaration : à vérifier avant toute diffusion.</span>
          </>
        )}
        {analyse.nbMesures > 1 && <span className="text-zinc-400">· Score moyen de {analyse.nbMesures} mesures analysées.</span>}
      </p>
    </section>
  );
}

// --- Panneau « analyse détaillée » ------------------------------------------------

function DetailPanel({ analyse, declaration }) {
  const levels = axisLevels(analyse.mesures);
  const hasAxes = AXES.some((axe) => analyse.syntheses[axe.key]);
  const sources = [...analyse.sources].sort((a, b) => a.id - b.id);

  return (
    <div id="analyse-detaillee" className={`${GO_CARD} flex flex-col gap-6 p-6 sm:p-8`}>
      {declaration ? <div>{declaration}</div> : null}

      {hasAxes && (
        <div>
          <h3 className="text-base font-bold text-zinc-900">Synthèse par axe</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {AXES.map((axe) => {
              const tone = levels ? levelTone(levels[axe.key]) : "neutral";
              return (
                <section key={axe.key} className="rounded-xl border border-[#e6e4de] bg-white p-4">
                  <div className="flex items-center gap-2.5">
                    <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${TONE_STYLES[tone]}`}>
                      <Icon name={axe.icon} className="h-4 w-4" />
                    </span>
                    <h4 className="text-sm font-semibold text-zinc-900">{axe.label}</h4>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                    {analyse.syntheses[axe.key] ?? "Non renseigné."}
                  </p>
                </section>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-base font-bold text-zinc-900">
          Détail par mesure{analyse.mesures.length > 1 ? ` (${analyse.mesures.length})` : ""}
        </h3>
        <div className="mt-3 flex flex-col gap-4">
          {analyse.mesures.length === 0 ? (
            <Notice>{"Le détail par critère n'est pas disponible pour cette analyse."}</Notice>
          ) : (
            analyse.mesures.map((mesure, index) => <MesureCard key={index} mesure={mesure} index={index} />)
          )}
          {analyse.remarque && <p className="text-sm text-zinc-500">{analyse.remarque}</p>}
        </div>
      </div>

      <div>
        <h3 className="text-base font-bold text-zinc-900">Sources ({analyse.enrichi ? sources.length : 0})</h3>
        {!analyse.enrichi ? (
          <div className="mt-3">
            <Notice>{LEGACY_NOTICE}</Notice>
          </div>
        ) : (
          <>
            <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900">
              {analyse.mode === "approfondie"
                ? "Sources trouvées par la recherche web lors de l'analyse. Une source de plaidoyer n'est jamais retenue seule pour appuyer un fait. Relisez les sources clés avant toute diffusion."
                : "Pistes de vérification issues des connaissances de l'analyse (institutions, textes officiels) : elle n'effectue aucune recherche web et ne lit pas ces sources. À consulter et à vérifier avant toute diffusion."}
            </p>
            {sources.length === 0 ? (
              <div className="mt-3">
                <Notice>
                  {analyse.mode === "approfondie"
                    ? "La recherche n'a pas permis d'identifier de source fiable pour cette déclaration. Vérifiez les chiffres et les textes cités auprès de sources officielles."
                    : "Aucune source n'a pu être identifiée avec certitude pour cette déclaration. Vérifiez les chiffres et les textes cités auprès de sources officielles."}
                </Notice>
              </div>
            ) : (
              <ol className="mt-3 flex flex-col gap-2">
                {sources.map((source) => {
                  const href = safeHref(source.url);
                  return (
                    <li key={source.id} className="flex items-start gap-3 rounded-xl border border-[#e6e4de] bg-white p-4">
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
                            className="mt-1 inline-block break-all text-xs text-blue-600 hover:underline"
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
          </>
        )}
      </div>
    </div>
  );
}

// --- Les faits ---------------------------------------------------------------------

function FactsCard({ analyse }) {
  const count = analyse.affirmations.length;
  return (
    <section aria-labelledby="les-faits" className={`${GO_CARD} p-6`}>
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="les-faits" className="text-2xl font-bold tracking-tight text-zinc-900">
          Les faits
        </h2>
        {analyse.enrichi && (
          <p className="shrink-0 text-sm text-zinc-500">
            {count} {count > 1 ? "faits analysés" : "fait analysé"}
          </p>
        )}
      </div>

      {!analyse.enrichi ? (
        <div className="mt-4">
          <Notice>{LEGACY_NOTICE}</Notice>
        </div>
      ) : count === 0 ? (
        <div className="mt-4">
          <Notice>{"Aucune affirmation vérifiable n'a été extraite de cette déclaration."}</Notice>
        </div>
      ) : (
        <ul className="mt-3 divide-y divide-[#e6e4de]">
          {analyse.affirmations.map((affirmation, index) => {
            const linked = affirmation.sources
              .map((id) => analyse.sources.find((source) => source.id === id))
              .filter(Boolean);
            return (
              <li key={index} className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-4 gap-y-2 py-4 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
                <span className="col-start-1 row-start-1 flex"><VerdictDot verdict={affirmation.verdict} /></span>
                <div className="col-start-2 row-start-1 min-w-0">
                  <p className="text-[15px] font-semibold leading-snug text-zinc-900">{affirmation.texte}</p>
                  {linked.length > 0 ? (
                    <ul className="mt-1.5 flex flex-col gap-1">
                      {linked.slice(0, SOURCES_PAR_FAIT).map((source) => (
                        <li key={source.id}>
                          <SourceLink source={source} />
                        </li>
                      ))}
                      {linked.length > SOURCES_PAR_FAIT && (
                        <li className="text-xs text-zinc-400">
                          + {linked.length - SOURCES_PAR_FAIT} autre{linked.length - SOURCES_PAR_FAIT > 1 ? "s" : ""}{" "}
                          dans l&apos;analyse détaillée
                        </li>
                      )}
                    </ul>
                  ) : (
                    <p className="mt-1.5 text-sm text-zinc-400">Aucune source identifiée pour ce fait.</p>
                  )}
                </div>
                <VerdictPill verdict={affirmation.verdict} className="col-start-2 row-start-2 justify-self-start sm:col-start-3 sm:row-start-1" />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// --- Page ----------------------------------------------------------------------------

export default function AnalysisView({ analyse, declaration = null }) {
  const [expanded, setExpanded] = useState(false);
  const resume = analyse.syntheseGlobale ?? analyse.mesures[0]?.verdict_court ?? null;

  return (
    <div className="flex flex-col gap-4">
      <ScoreCard analyse={analyse} />

      <section aria-labelledby="resume" className={`${GO_CARD} p-6 sm:px-8`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
          <div className="min-w-0 max-w-3xl">
            <h2 id="resume" className="text-2xl font-bold tracking-tight text-zinc-900">
              Résumé
            </h2>
            <p className="mt-2 text-base leading-relaxed text-zinc-600">
              {resume ?? "Pas de résumé disponible : consultez l'analyse détaillée."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setExpanded((open) => !open)}
            aria-expanded={expanded}
            aria-controls="analyse-detaillee"
            className="inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100"
          >
            <Icon name="bookOpen" className="h-5 w-5" />
            {expanded ? "Masquer l'analyse détaillée" : "Lire l'analyse détaillée"}
          </button>
        </div>
      </section>

      {expanded && <DetailPanel analyse={analyse} declaration={declaration} />}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <FactsCard analyse={analyse} />
        <InterviewQuestions analyseId={analyse.id} initial={analyse.questions} sources={analyse.sources} />
      </div>
    </div>
  );
}
