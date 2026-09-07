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
const ICON_INFO = (
  <>
    <circle cx="12" cy="12" r="8.25" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 11v5.25" />
    <circle cx="12" cy="8" r="0.1" fill="currentColor" stroke="currentColor" strokeWidth="1.8" />
  </>
);

// 5 macro-étapes publiques, résumant l'esprit de data/prompt-methodologie.md
// (section MÉTHODE D'ANALYSE) — représentation volontairement simplifiée du
// pipeline réel pour l'affichage public (voir la demande d'origine : la
// maquette cible montre 5 cartes, pas les 7 sous-étapes internes). "Vérifier
// le lien de cause à effet" et "Comparer à un repère neutre" (étapes 1bis et
// 1ter du prompt réel, toujours appliquées côté analyse) sont fondues dans
// cette version publique plutôt qu'affichées comme des cartes séparées :
// aucun impact sur le prompt IA ni sur scripts/analyze.js, uniquement sur
// cette illustration. Noms de variables input/output plausibles pour le
// panneau "console", pas les vrais noms de champs internes (volontaire, pour
// ne jamais exposer la structure technique réelle au public).
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
    body: "Données publiques d'abord (Légifrance, INSEE, Cour des comptes...) — jamais une source militante comme preuve d'un fait.",
  },
  {
    id: "03",
    icon: ICON_TARGET,
    cardTitle: "Situer la mesure dans son contexte",
    input: "corpus_sources",
    output: "mesure_contextualisee",
    title: "La mesure est replacée dans son contexte.",
    body: "Dans le programme du candidat, dans la réalité française actuelle, et à l'international quand c'est pertinent.",
  },
  {
    id: "04",
    icon: ICON_BARCHART,
    cardTitle: "Évaluer selon 5 critères",
    input: "mesure_contextualisee",
    output: "notation_detaillee",
    title: "La mesure est notée selon cinq critères indépendants.",
    body: "Cinq critères, chacun noté séparément, pour un total sur 100 points — détail plus bas sur cette page.",
  },
  {
    id: "05",
    icon: ICON_CHECK_CIRCLE,
    cardTitle: "Qualifier le résultat",
    input: "notation_detaillee",
    output: "verdict_final",
    title: "Ce qui est établi, probable, discutable et inconnu est distingué explicitement.",
    body: "Quand une source manque, on l'écrit noir sur blanc — « sources insuffisantes » — plutôt que de deviner.",
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
      className={`h-4.5 w-4.5 shrink-0 ${active ? "text-blue-500" : "text-zinc-400"}`}
      aria-hidden="true"
    >
      {icon}
    </svg>
  );
}

// Survol sur desktop, focus clavier (Tab) et tap sur mobile (pas de :hover
// fiable au toucher) : un même état `activeIndex`, mis à jour par
// onMouseEnter, onFocus et onClick — les trois ne se contredisent jamais
// puisqu'ils pointent tous vers le même index pour un bouton donné.
export default function MethodeAnalysisSteps() {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = STEPS[activeIndex];

  return (
    <div>
      {/* Empilé verticalement sous sm (5 colonnes n'ont pas la place de
          rester lisibles avant ce point), grille de 5 colonnes égales à
          partir de sm. Une seule ligne pointillée de fond (position
          absolute, z-index sous les cartes) plutôt que des petits traits
          indépendants entre chaque paire de cartes : le fond blanc de
          chaque carte la masque naturellement là où elle passe derrière,
          ne laissant apparaître le pointillé que dans les intervalles. */}
      <div className="relative flex flex-col gap-3 sm:grid sm:grid-cols-5 sm:gap-6 sm:gap-y-0 lg:gap-x-16">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-1/2 z-0 hidden border-t-2 border-dashed border-zinc-300 sm:block"
        />
        {STEPS.map((step, index) => (
          <button
            key={step.id}
            type="button"
            onMouseEnter={() => setActiveIndex(index)}
            onFocus={() => setActiveIndex(index)}
            onClick={() => setActiveIndex(index)}
            aria-pressed={index === activeIndex}
            className={`relative z-10 flex min-h-[88px] flex-col justify-between gap-4 rounded-[14px] border bg-white p-4 text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 sm:min-h-[152px] sm:gap-0 sm:p-5 ${
              index === activeIndex
                ? "border-blue-400"
                : "border-zinc-200 hover:border-zinc-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`font-mono text-xs font-semibold ${index === activeIndex ? "text-blue-500" : "text-zinc-400"}`}
              >
                {`// ${step.id}`}
              </span>
              <StepIcon icon={step.icon} active={index === activeIndex} />
            </div>
            <p className="text-[17px] leading-snug text-zinc-900">
              {step.cardTitle}
            </p>
          </button>
        ))}
      </div>

      <div className="mt-6 rounded-[14px] border border-zinc-200 bg-white p-6 sm:p-10">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-[minmax(0,265px)_1fr]">
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

          {/* Volontairement peu rempli (voir la demande d'origine : "le vide
              fait partie du design") — pas de lien ni d'information
              supplémentaire ajoutée ici pour combler l'espace. */}
          <div className="border-t border-zinc-100 pt-6 sm:border-l sm:border-t-0 sm:pl-10 sm:pt-0">
            <p className="max-w-md text-[28px] font-bold leading-snug text-zinc-900">
              {active.title}
            </p>
            <p className="mt-3 max-w-md text-lg leading-relaxed text-zinc-500">
              {active.body}
            </p>
          </div>
        </div>
      </div>

      <p className="mt-4 flex items-center gap-1.5 text-xs text-zinc-400">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          className="h-3.5 w-3.5 shrink-0"
          aria-hidden="true"
        >
          {ICON_INFO}
        </svg>
        Les détails complets apparaissent au survol de chaque étape.
      </p>
    </div>
  );
}
