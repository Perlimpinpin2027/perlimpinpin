"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { mettreALaCorbeille } from "./actions";

// Petit bouton « Supprimer » d'une carte de /test, affiché seulement aux personnes
// déverrouillées (mais c'est l'action serveur qui vérifie vraiment l'accès).
// Rien n'est supprimé : le brouillon passe au statut « corbeille ». Pour confirmer,
// il faut taper le n° de l'analyse ; c'est ce même n° qui part au serveur.
export default function CorbeilleBouton({ analyseId, titre }) {
  const dialogRef = useRef(null);
  const [saisie, setSaisie] = useState("");
  const [message, setMessage] = useState(null);
  const [enCours, startTransition] = useTransition();

  const numeroCorrect = saisie.trim() === String(analyseId);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    // Échap ou clic hors de la fenêtre : on repart de zéro à la prochaine ouverture.
    const reinitialiser = () => {
      setSaisie("");
      setMessage(null);
    };
    dialog.addEventListener("close", reinitialiser);
    return () => dialog.removeEventListener("close", reinitialiser);
  }, []);

  function confirmer(event) {
    event.preventDefault();
    if (!numeroCorrect || enCours) return;
    setMessage(null);
    startTransition(async () => {
      const resultat = await mettreALaCorbeille(analyseId);
      if (resultat?.ok && !resultat.simulation) {
        // La page est recalculée par l'action (revalidatePath) : la carte disparaît.
        dialogRef.current?.close();
        return;
      }
      setMessage(
        resultat?.simulation
          ? { ok: true, message: "Mode simulation : rien n'a été écrit en base." }
          : resultat ?? { ok: false, message: "Erreur inattendue." },
      );
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="text-xs font-medium text-zinc-400 underline underline-offset-2 transition-colors hover:text-red-700"
      >
        Supprimer
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={`corbeille-titre-${analyseId}`}
        onClick={(event) => {
          // Clic sur le fond (hors du contenu) : fermeture.
          if (event.target === dialogRef.current && !enCours) dialogRef.current.close();
        }}
        className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-xl border border-zinc-200 bg-white p-0 text-zinc-900 shadow-xl backdrop:bg-zinc-900/40"
      >
        <form onSubmit={confirmer} className="flex flex-col gap-3 p-5">
          <p id={`corbeille-titre-${analyseId}`} className="text-base font-semibold">
            Mettre ce brouillon à la corbeille ?
          </p>
          <div className="rounded-lg bg-zinc-50 p-3">
            <p className="text-sm font-semibold">{titre}</p>
            <p className="mt-1 font-mono text-xs text-zinc-500">Analyse #{analyseId}</p>
          </div>
          <p className="text-sm text-zinc-600">
            Il disparaîtra de la liste des brouillons, sans être supprimé de la base.
          </p>
          <label htmlFor={`corbeille-saisie-${analyseId}`} className="text-sm">
            Pour confirmer, tapez le n° de l&rsquo;analyse : <strong>{analyseId}</strong>
          </label>
          <input
            id={`corbeille-saisie-${analyseId}`}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            autoFocus
            value={saisie}
            onChange={(event) => setSaisie(event.target.value)}
            disabled={enCours}
            className="w-32 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-red-200"
          />
          {message ? (
            <p role="alert" className={`text-xs font-semibold ${message.ok ? "text-zinc-700" : "text-red-700"}`}>
              {message.message}
            </p>
          ) : null}
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              disabled={enCours}
              className="rounded-full px-4 py-1.5 text-sm font-semibold text-zinc-700 transition-opacity hover:opacity-70 disabled:opacity-40"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={!numeroCorrect || enCours}
              className="rounded-full bg-red-700 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {enCours ? "En cours…" : "Mettre à la corbeille"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
