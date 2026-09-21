"use client";

import { useState, useTransition } from "react";
import { publierBrouillon } from "./actions";

// Bouton « Publier sur le site » avec confirmation dans la page (pas de
// window.confirm). Affiché seulement aux personnes déverrouillées, mais c'est
// l'action serveur qui vérifie vraiment l'accès. En cas de succès, l'action
// redirige vers la fiche publique ; sinon elle renvoie un message à afficher ici.
export default function PublishBox({ analyseId, candidatNom, simulation }) {
  const [confirmation, setConfirmation] = useState(false);
  const [message, setMessage] = useState(null);
  const [enCours, startTransition] = useTransition();

  function publier() {
    setMessage(null);
    startTransition(async () => {
      const resultat = await publierBrouillon(analyseId);
      // Si la publication a réussi, on n'arrive jamais ici : la page a été redirigée.
      if (resultat) setMessage(resultat);
      setConfirmation(false);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {!confirmation ? (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setMessage(null);
              setConfirmation(true);
            }}
            disabled={enCours}
            className="rounded-full bg-zinc-900 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Publier sur le site
          </button>
          {simulation ? (
            <span className="text-xs font-semibold">
              Mode simulation : rien ne sera écrit en base.
            </span>
          ) : null}
        </div>
      ) : (
        <div
          role="alertdialog"
          aria-label="Confirmer la publication"
          className="flex flex-col gap-3 rounded-xl border border-amber-400 bg-white p-4 text-zinc-900"
        >
          <p className="text-sm font-semibold">Publier cette analyse ?</p>
          <p className="text-sm">
            Elle sera visible par tout le monde sur le site public et comptera
            dans la moyenne de {candidatNom}.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={publier}
              disabled={enCours}
              className="rounded-full bg-zinc-900 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {enCours ? "Envoi…" : "Confirmer la publication"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmation(false)}
              disabled={enCours}
              className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {message ? (
        <p
          role="status"
          className={`text-sm font-semibold ${message.ok ? "text-emerald-900" : "text-red-800"}`}
        >
          {message.message}
        </p>
      ) : null}
    </div>
  );
}
