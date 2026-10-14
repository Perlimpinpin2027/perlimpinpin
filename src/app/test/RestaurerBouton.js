"use client";

import { useState, useTransition } from "react";
import { restaurerDepuisCorbeille } from "./actions";

// Bouton « Restaurer » d'une analyse de la corbeille de /test. Pas de confirmation :
// on peut toujours la remettre à la corbeille ensuite. C'est l'action serveur qui
// vérifie l'accès ; en cas de succès, elle recalcule la page (revalidatePath) et
// l'analyse revient dans la liste des brouillons.
export default function RestaurerBouton({ analyseId }) {
  const [message, setMessage] = useState(null);
  const [enCours, startTransition] = useTransition();

  function restaurer() {
    setMessage(null);
    startTransition(async () => {
      const resultat = await restaurerDepuisCorbeille(analyseId);
      if (resultat?.ok && !resultat.simulation) return;
      setMessage(
        resultat?.simulation
          ? { ok: true, message: "Mode simulation : rien n'a été écrit en base." }
          : resultat ?? { ok: false, message: "Erreur inattendue." },
      );
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={restaurer}
        disabled={enCours}
        className="rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {enCours ? "Restauration…" : "Restaurer"}
      </button>
      {message ? (
        <p role="alert" className={`text-xs font-semibold ${message.ok ? "text-zinc-700" : "text-red-700"}`}>
          {message.message}
        </p>
      ) : null}
    </div>
  );
}
