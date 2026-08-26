"use client";

import { useState } from "react";

// Icônes dessinées à la main (formes simples : cercles/rects/traits) plutôt
// que des tracés Heroicons recopiés de mémoire — plus sûr que de risquer un
// path malformé pour une icône purement décorative.
const ICON_PENCIL = (
  <>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 20l1-4L15.5 5.5l3 3L8 19l-4 1Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 7 16.5 10" />
  </>
);
const ICON_DATABASE = (
  <>
    <ellipse cx="12" cy="6" rx="7" ry="2.5" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 6v5.5c0 1.381 3.134 2.5 7 2.5s7-1.119 7-2.5V6" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 11.5V17c0 1.381 3.134 2.5 7 2.5s7-1.119 7-2.5v-5.5" />
  </>
);
const ICON_TARGET = (
  <>
    <circle cx="12" cy="12" r="8.25" />
    <circle cx="12" cy="12" r="4.75" />
    <circle cx="12" cy="12" r="1.25" fill="currentColor" stroke="none" />
  </>
);
const ICON_BARCHART = (
  <>
    <rect x="4" y="12" width="3.5" height="7" rx="0.5" />
    <rect x="10.25" y="7" width="3.5" height="12" rx="0.5" />
    <rect x="16.5" y="9.5" width="3.5" height="9.5" rx="0.5" />
  </>
);
const ICON_CHECK_CIRCLE = (
  <>
    <circle cx="12" cy="12" r="8.25" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 12.25 10.75 14.75 15.75 9.5" />
  </>
);

// Résume l'esprit de data/prompt-methodologie.md (section MÉTHODE
// D'ANALYSE) en 5 étapes publiques, avec des noms de variables techniques
// plausibles pour le panneau "console" — ce ne sont pas les vrais noms de
// champs du pipeline interne (voir scripts/analyze.js), volontairement,
// pour ne jamais exposer la structure technique réelle au public.
const STEPS = [
  {
    id: "01",
    icon: ICON_PENCIL,
    cardTitle: "Reformuler la déclaration",
    input: "declaration_brute",
    output: "declaration_reformulee",
    title: "La déclaration est reformulée simplement.",
    body: "On résume la promesse en une phrase claire, sans l'interprétation du candidat ni la nôtre.",
  },
  {
    id: "02",
    icon: ICON_DATABASE,
    cardTitle: "Rassembler les sources",
    input: "declaration_reformulee",
    output: "corpus_sources",
    title: "Les sources sont rassemblées et vérifiées.",
    body: "Textes de loi, données officielles, rapports — jamais une source militante comme preuve d'un fait.",
  },
  {
    id: "03",
    icon: ICON_TARGET,
    cardTitle: "Situer la mesure dans son contexte",
    input: "corpus_sources",
    output: "mesure_contextualisee",
    title: "La mesure est replacée dans son contexte.",
    body: "Dans le programme du candidat, dans le droit français, et à l'international quand c'est pertinent.",
  },
  {
    id: "04",
    icon: ICON_BARCHART,
    cardTitle: "Évaluer selon 5 critères",
    input: "mesure_contextualisee",
    output: "notation_detaillee",
    title: "La mesure est notée selon cinq critères indépendants.",
    body: "Solidité factuelle, efficacité attendue, faisabilité juridique, coût, faisabilité opérationnelle : chacun noté séparément.",
  },
  {
    id: "05",
    icon: ICON_CHECK_CIRCLE,
    cardTitle: "Qualifier le résultat",
    input: "notation_detaillee",
    output: "verdict_final",
    title: "Le résultat est qualifié en un verdict clair.",
    body: "Un score sur 100, une catégorie explicite, et les limites de l'analyse assumées plutôt que cachées.",
  },
];

function StepIcon({ icon, active }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className={`h-5 w-5 shrink-0 ${active ? "text-blue-600" : "text-zinc-400"}`}
      aria-hidden="true"
    >
      {icon}
    </svg>
  );
}

// Survol sur desktop, tap sur mobile (pas de :hover fiable au toucher) :
// un même état `activeIndex`, mis à jour par onMouseEnter (souris) et
// onClick (les deux, sans conflit — le clic déclenche aussi un survol sur
// desktop, ce qui ne change rien puisque c'est déjà le même index).
export default function MethodeAnalysisSteps() {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = STEPS[activeIndex];

  return (
    <div>
      {/* Empilé verticalement sous sm (une rangée de 5 cartes serait trop
          étroite pour rester lisible/tapable sur mobile), rangée
          horizontale à partir de sm comme sur la maquette desktop. */}
      <div className="flex flex-col sm:flex-row sm:items-stretch">
        {STEPS.map((step, index) => (
          <div key={step.id} className="flex flex-col sm:flex-1 sm:items-stretch">
            <button
              type="button"
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => setActiveIndex(index)}
              aria-pressed={index === activeIndex}
              className={`flex w-full flex-col gap-4 rounded-2xl border bg-white p-4 text-left transition-colors sm:p-5 ${
                index === activeIndex
                  ? "border-blue-400 ring-1 ring-blue-100"
                  : "border-zinc-200 hover:border-zinc-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`font-mono text-xs font-semibold ${index === activeIndex ? "text-blue-600" : "text-zinc-400"}`}
                >
                  {`// ${step.id}`}
                </span>
                <StepIcon icon={step.icon} active={index === activeIndex} />
              </div>
              <p className="text-sm font-semibold leading-snug text-zinc-900">
                {step.cardTitle}
              </p>
            </button>

            {index < STEPS.length - 1 ? (
              <div
                aria-hidden="true"
                className="mx-1 hidden shrink-0 self-center border-t-2 border-dashed border-zinc-300 sm:mx-2 sm:block sm:w-4"
              />
            ) : null}
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-[minmax(0,220px)_1fr]">
          <div className="font-mono text-xs">
            <p className="font-semibold text-zinc-900">{`STEP_${active.id}`}</p>
            <p className="mt-2 flex items-center gap-1.5 text-zinc-500">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" aria-hidden="true" />
              status: active
            </p>

            <p className="mt-5 text-zinc-400">input</p>
            <p className="mt-1 font-semibold text-zinc-700">{active.input}</p>

            <p className="mt-4 text-zinc-400">output</p>
            <p className="mt-1 font-semibold text-zinc-700">{active.output}</p>
          </div>

          <div className="border-t border-zinc-100 pt-6 sm:border-l sm:border-t-0 sm:pl-8 sm:pt-0">
            <p className="text-lg font-bold text-zinc-900">{active.title}</p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-500">{active.body}</p>
          </div>
        </div>
      </div>

      <p className="mt-4 text-xs text-zinc-400">
        Les détails complets apparaissent au survol de chaque étape.
      </p>
    </div>
  );
}
