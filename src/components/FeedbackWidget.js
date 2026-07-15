"use client";

import { useEffect, useState } from "react";

const DISLIKE_REASONS = [
  { value: "pas_pertinent", label: "Pas pertinent" },
  { value: "sources_douteuses", label: "Sources douteuses ou insuffisantes" },
  { value: "score_trop_severe", label: "Score trop sévère" },
  { value: "score_trop_indulgent", label: "Score trop indulgent" },
  { value: "manque_de_nuance", label: "Manque de nuance / trop tranché" },
  { value: "erreur_factuelle", label: "Erreur factuelle" },
  { value: "autre", label: "Autre" },
];

function storageKey(analyseId) {
  return `feedback:${analyseId}`;
}

export default function FeedbackWidget({ analyseId, initialLikes, initialDislikes }) {
  const [likes, setLikes] = useState(initialLikes);
  const [dislikes, setDislikes] = useState(initialDislikes);
  const [voted, setVoted] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedRaison, setSelectedRaison] = useState(null);
  const [raisonAutreText, setRaisonAutreText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey(analyseId));
    if (stored) setVoted(stored);
  }, [analyseId]);

  async function sendFeedback(payload) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analyseId, ...payload }),
      });
      if (!res.ok) throw new Error("request failed");
      const data = await res.json();
      setLikes(data.likes);
      setDislikes(data.dislikes);
      window.localStorage.setItem(storageKey(analyseId), payload.type);
      setVoted(payload.type);
      setMenuOpen(false);
    } catch {
      setError("Une erreur est survenue, réessayez.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleLike() {
    sendFeedback({ type: "like" });
  }

  function handleDislikeClick() {
    setMenuOpen((open) => !open);
  }

  function handleSubmitDislike() {
    if (!selectedRaison) return;
    sendFeedback({
      type: "dislike",
      raison: selectedRaison,
      raisonAutre: selectedRaison === "autre" ? raisonAutreText : null,
    });
  }

  if (voted) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-6">
        <p className="text-sm text-zinc-500">
          Vous avez déjà donné votre avis sur cette analyse.
        </p>
        <div className="mt-3 flex items-center gap-4 text-sm text-zinc-400">
          <span>👍 Utile · {likes}</span>
          <span>👎 Pas convaincant · {dislikes}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6">
      <p className="text-sm font-semibold text-zinc-900">
        Cette analyse vous a-t-elle été utile ?
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleLike}
          disabled={submitting}
          className="flex items-center gap-2 rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          👍 Utile
          <span className="text-zinc-400">{likes}</span>
        </button>

        <button
          type="button"
          onClick={handleDislikeClick}
          disabled={submitting}
          className="flex items-center gap-2 rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          👎 Pas convaincant
          <span className="text-zinc-400">{dislikes}</span>
        </button>
      </div>

      {menuOpen ? (
        <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Qu'est-ce qui ne va pas ?
          </p>

          <div className="mt-3 flex flex-col gap-2">
            {DISLIKE_REASONS.map((reason) => (
              <label
                key={reason.value}
                className="flex items-center gap-2 text-sm text-zinc-700"
              >
                <input
                  type="radio"
                  name="dislike-raison"
                  value={reason.value}
                  checked={selectedRaison === reason.value}
                  onChange={() => setSelectedRaison(reason.value)}
                  className="h-3.5 w-3.5"
                />
                {reason.label}
              </label>
            ))}
          </div>

          {selectedRaison === "autre" ? (
            <input
              type="text"
              value={raisonAutreText}
              onChange={(event) => setRaisonAutreText(event.target.value)}
              placeholder="Précisez (optionnel)"
              maxLength={280}
              className="mt-3 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
            />
          ) : null}

          <button
            type="button"
            onClick={handleSubmitDislike}
            disabled={!selectedRaison || submitting}
            className="mt-4 rounded-full bg-zinc-900 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Envoyer
          </button>
        </div>
      ) : null}

      {error ? <p className="mt-3 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
