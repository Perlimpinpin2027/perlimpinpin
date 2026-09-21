"use client";

import { useEffect, useRef, useState } from "react";
import { copyText } from "./clipboard";
import { ComingSoon, Icon } from "./ui";

// Actions en haut de la page d'une analyse.
//   - Partager : copie le lien direct vers la page (elle reste protégée par le mot
//     de passe /live : la personne qui ouvre le lien doit se connecter).
//   - Exporter : ouvre la vue imprimable dans un nouvel onglet, qui lance
//     l'impression (enregistrement en PDF via le navigateur).
//   - « … » : pas encore branché.
export default function AnalysisActions({ analyseId }) {
  const [copied, setCopied] = useState("idle"); // idle | copied | failed
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function share() {
    try {
      // Adresse canonique de la page (sans paramètres ni ancre éventuels)
      await copyText(new URL(`/live/analyses/${analyseId}`, window.location.origin).href);
      setCopied("copied");
    } catch {
      setCopied("failed");
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied("idle"), 2200);
  }

  const shareColor =
    copied === "copied" ? "text-emerald-600" : copied === "failed" ? "text-red-500" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900";

  return (
    <div className="flex shrink-0 items-center gap-2">
      <button
        type="button"
        onClick={share}
        title="Copier le lien de cette analyse"
        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${shareColor}`}
      >
        <Icon name={copied === "copied" ? "check" : "share"} className="h-4 w-4" />
        <span className={copied === "idle" ? "hidden sm:inline" : ""}>
          {copied === "copied" ? "Lien copié" : copied === "failed" ? "Copie impossible" : "Partager"}
        </span>
        <span className="sr-only" aria-live="polite">
          {copied === "copied" ? "Lien copié" : copied === "failed" ? "Copie impossible" : ""}
        </span>
      </button>

      <ComingSoon>
        <button
          type="button"
          disabled
          aria-label="Plus d'actions"
          className="cursor-not-allowed rounded-lg px-2 py-2 text-zinc-400"
        >
          <Icon name="dots" className="h-4 w-4" />
        </button>
      </ComingSoon>

      <a
        href={`/live/analyses/${analyseId}/imprimer`}
        target="_blank"
        rel="noopener"
        title="Ouvrir la vue imprimable (enregistrement en PDF)"
        className="flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-800"
      >
        Exporter
        <Icon name="download" className="h-4 w-4" />
      </a>
    </div>
  );
}
