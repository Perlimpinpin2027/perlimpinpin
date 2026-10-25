"use client";

import { useEffect, useRef, useState } from "react";
import { copyText } from "./clipboard";
import { ComingSoon, GO_BUTTON, Icon } from "./ui";

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
    copied === "copied" ? "!text-emerald-700" : copied === "failed" ? "!text-red-600" : "";

  return (
    <div className="flex shrink-0 items-center gap-2 sm:gap-3">
      <button
        type="button"
        onClick={share}
        title="Copier le lien de cette analyse"
        className={`${GO_BUTTON} h-11 px-3 sm:px-4 ${shareColor}`}
      >
        <Icon name={copied === "copied" ? "check" : "share"} className="h-5 w-5" />
        <span className={copied === "idle" ? "hidden sm:inline" : ""}>
          {copied === "copied" ? "Lien copié" : copied === "failed" ? "Copie impossible" : "Partager"}
        </span>
        <span className="sr-only" aria-live="polite">
          {copied === "copied" ? "Lien copié" : copied === "failed" ? "Copie impossible" : ""}
        </span>
      </button>

      <a
        href={`/live/analyses/${analyseId}/imprimer`}
        target="_blank"
        rel="noopener"
        title="Ouvrir la vue imprimable (enregistrement en PDF)"
        className={`${GO_BUTTON} h-11 px-3 sm:px-4`}
      >
        <Icon name="download" className="h-5 w-5" />
        <span className="hidden sm:inline">Exporter</span>
      </a>

      <ComingSoon>
        <button type="button" disabled aria-label="Plus d'actions" className={`${GO_BUTTON} h-11 w-11 justify-center`}>
          <Icon name="dots" className="h-5 w-5" />
        </button>
      </ComingSoon>
    </div>
  );
}
