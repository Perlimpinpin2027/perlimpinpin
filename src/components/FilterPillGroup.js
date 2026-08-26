"use client";

import { useState } from "react";
import Link from "next/link";

function pillClass(active) {
  return `rounded-full px-3 py-1 text-sm font-semibold transition-colors ${
    active ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
  }`;
}

// currentParams est un objet simple (candidat/theme/sort -> string), pas une
// fonction : les props d'un Server Component vers un Client Component
// doivent être sérialisables, donc la construction du href se fait ici,
// pas via une fonction buildHref passée depuis la page.
function buildHref(currentParams, paramKey, value) {
  const params = new URLSearchParams(currentParams);
  if (value == null) {
    params.delete(paramKey);
  } else {
    params.set(paramKey, value);
  }
  const query = params.toString();
  return query ? `/declarations?${query}` : "/declarations";
}

// Ligne de filtre en pills : "Tous" toujours visible, puis les options au-delà
// d'un seuil repliées derrière un "+N" cliquable (voir la maquette) plutôt que
// d'étaler une longue liste de pills sur plusieurs lignes.
export default function FilterPillGroup({
  label,
  options,
  activeValue,
  paramKey,
  currentParams,
  visibleCount = 6,
}) {
  const [expanded, setExpanded] = useState(false);
  const hiddenCount = Math.max(0, options.length - visibleCount);
  const visibleOptions = expanded ? options : options.slice(0, visibleCount);

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-500">
        {label}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={buildHref(currentParams, paramKey, null)}
          className={pillClass(!activeValue)}
        >
          Tous
        </Link>
        {visibleOptions.map((option) => (
          <Link
            key={option.value}
            href={buildHref(
              currentParams,
              paramKey,
              activeValue === option.value ? null : option.value,
            )}
            className={pillClass(activeValue === option.value)}
          >
            {option.label}
          </Link>
        ))}
        {!expanded && hiddenCount > 0 ? (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold text-zinc-500 transition-colors hover:bg-zinc-100"
          >
            {`+${hiddenCount}`}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="h-3.5 w-3.5"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
        ) : null}
      </div>
    </div>
  );
}
