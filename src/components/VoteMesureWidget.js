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

// Widget de vote sur la MESURE POLITIQUE elle-même (d'accord / pas
// d'accord), distinct de FeedbackWidget qui porte sur la qualité de
// l'analyse de Perlimpinpin. Pas de popup, pas de collecte de raison ou de
// donnée démographique — juste deux boutons.
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
      <div className="rounded-2xl border-2 border-blue-200 bg-blue-50/50 p-6">
        <p className="text-sm text-zinc-500">Vous avez déjà donné votre avis sur cette mesure.</p>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-zinc-400">
          <span>👍 D&apos;accord · {accord}</span>
          <span>👎 Pas d&apos;accord · {desaccord}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border-2 border-blue-200 bg-blue-50/50 p-6">
      <p className="text-sm font-semibold text-zinc-900">Et vous, qu&apos;en pensez-vous ?</p>
      <p className="mt-1 text-xs text-zinc-500">
        Votre avis sur la mesure elle-même — pas sur la qualité de notre analyse.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => handleVote("accord")}
          disabled={submitting}
          className="flex items-center gap-2 rounded-full border border-blue-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          👍 D&apos;accord avec cette mesure
          <span className="text-zinc-400">{accord}</span>
        </button>

        <button
          type="button"
          onClick={() => handleVote("desaccord")}
          disabled={submitting}
          className="flex items-center gap-2 rounded-full border border-blue-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          👎 Pas d&apos;accord avec cette mesure
          <span className="text-zinc-400">{desaccord}</span>
        </button>
      </div>

      {error ? <p className="mt-3 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
