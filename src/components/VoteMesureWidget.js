"use client";

import { useEffect, useState } from "react";

function storageKey(propositionId) {
  return `vote-mesure:${propositionId}`;
}

// Deux exemplaires de ce composant vivent sur la même page (haut et bas) —
// cet événement custom permet de synchroniser l'état (déjà voté ? compteurs
// à jour ?) entre les deux instances sans recharger la page, dès que l'une
// des deux enregistre un vote.
const VOTE_EVENT = "perlimpinpin:vote-mesure";

// Flèches minimalistes plutôt que des emojis 👍/👎, cohérentes avec le reste
// de l'iconographie du site. Même paire que FeedbackWidget, pour
// l'uniformité visuelle des deux systèmes de vote de la page.
function ArrowIcon({ direction }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d={
          direction === "up"
            ? "M12 19.5v-15m0 0-6.75 6.75M12 4.5l6.75 6.75"
            : "M12 4.5v15m0 0-6.75-6.75M12 19.5l6.75-6.75"
        }
      />
    </svg>
  );
}

// Widget de vote sur la MESURE POLITIQUE elle-même (d'accord / pas
// d'accord), distinct de FeedbackWidget qui porte sur la qualité de
// l'analyse de Perlimpinpin. Pas de popup, pas de collecte de raison ou de
// donnée démographique — juste deux boutons. Même carte (bordure, fond,
// tailles, espacements) que FeedbackWidget : les deux systèmes de vote de la
// page doivent avoir la même importance visuelle, seule leur question change.
export default function VoteMesureWidget({ propositionId, initialAccord, initialDesaccord }) {
  const [accord, setAccord] = useState(initialAccord);
  const [desaccord, setDesaccord] = useState(initialDesaccord);
  const [voted, setVoted] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey(propositionId));
    if (stored) setVoted(stored);

    function handleExternalVote(event) {
      const detail = event.detail;
      if (!detail || detail.propositionId !== propositionId) return;
      setAccord(detail.accord);
      setDesaccord(detail.desaccord);
      setVoted(detail.type);
    }

    window.addEventListener(VOTE_EVENT, handleExternalVote);
    return () => window.removeEventListener(VOTE_EVENT, handleExternalVote);
  }, [propositionId]);

  async function handleVote(type) {
    if (voted || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/vote-mesure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propositionId, type }),
      });
      if (!res.ok) throw new Error("request failed");
      const data = await res.json();
      setAccord(data.accord);
      setDesaccord(data.desaccord);
      window.localStorage.setItem(storageKey(propositionId), type);
      setVoted(type);
      window.dispatchEvent(
        new CustomEvent(VOTE_EVENT, {
          detail: { propositionId, type, accord: data.accord, desaccord: data.desaccord },
        }),
      );
    } catch {
      setError("Une erreur est survenue, réessayez.");
    } finally {
      setSubmitting(false);
    }
  }

  if (voted) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-6">
        <p className="text-sm font-semibold text-zinc-900">Et vous, qu&apos;en pensez-vous ?</p>
        <p className="mt-1 text-xs text-zinc-500">
          Votre avis sur la mesure elle-même — pas sur la qualité de notre analyse.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-zinc-400">
          <span className="flex items-center gap-1.5">
            <ArrowIcon direction="up" /> D&apos;accord · {accord}
          </span>
          <span className="flex items-center gap-1.5">
            <ArrowIcon direction="down" /> Pas d&apos;accord · {desaccord}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6">
      <p className="text-sm font-semibold text-zinc-900">Et vous, qu&apos;en pensez-vous ?</p>
      <p className="mt-1 text-xs text-zinc-500">
        Votre avis sur la mesure elle-même — pas sur la qualité de notre analyse.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => handleVote("accord")}
          disabled={submitting}
          className="flex items-center gap-2 rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ArrowIcon direction="up" />
          D&apos;accord avec cette mesure
          <span className="text-zinc-400">{accord}</span>
        </button>

        <button
          type="button"
          onClick={() => handleVote("desaccord")}
          disabled={submitting}
          className="flex items-center gap-2 rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ArrowIcon direction="down" />
          Pas d&apos;accord avec cette mesure
          <span className="text-zinc-400">{desaccord}</span>
        </button>
      </div>

      {error ? <p className="mt-3 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
