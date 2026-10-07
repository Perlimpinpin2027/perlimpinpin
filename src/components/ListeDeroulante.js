"use client";

import { useState } from "react";

// Liste « Dérouler / Réduire » de l'indice de fiabilité (page d'accueil).
// Les lignes sont rendues côté serveur (BottomColumns) : `children` = les
// premières lignes, toujours visibles ; `suite` = les suivantes, montées
// dans le DOM seulement après le clic (rendu conditionnel, pas de display:
// none), pour que leurs photos ne soient pas téléchargées tant que la liste
// reste réduite.
export default function ListeDeroulante({ children, suite }) {
  const [ouvert, setOuvert] = useState(false);
  const aSuite = Array.isArray(suite) ? suite.length > 0 : Boolean(suite);

  return (
    <>
      <ol className="flex flex-col gap-5">
        {children}
        {ouvert ? suite : null}
      </ol>
      {aSuite ? (
        <button
          type="button"
          aria-expanded={ouvert}
          onClick={() => setOuvert((valeur) => !valeur)}
          className="mt-5 flex items-center gap-1 text-sm font-semibold text-zinc-500 transition-colors hover:text-zinc-900"
        >
          {ouvert ? "Réduire" : "Dérouler"}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            className={`h-4 w-4 transition-transform duration-200 ${ouvert ? "rotate-180" : ""}`}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m19.5 8.25-7.5 7.5-7.5-7.5"
            />
          </svg>
        </button>
      ) : null}
    </>
  );
}
