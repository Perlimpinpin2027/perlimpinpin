"use client";

import { useEffect } from "react";
import { Icon } from "./ui";

// Barre de commande de la vue imprimable (masquée à l'impression). À l'ouverture,
// lance l'impression : le journaliste choisit « Enregistrer au format PDF » dans
// la fenêtre du navigateur. Avec ?apercu=1 (auto = false), la vue s'affiche sans
// lancer l'impression.
export default function PrintControls({ retourHref, auto }) {
  useEffect(() => {
    if (!auto) return undefined;
    // Court délai : laisse le temps aux polices et aux images de s'afficher
    const timer = setTimeout(() => window.print(), 700);
    return () => clearTimeout(timer);
  }, [auto]);

  return (
    <div className="mb-8 flex flex-wrap items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 print:hidden">
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-800"
      >
        <Icon name="printer" className="h-4 w-4" />
        Imprimer / Enregistrer en PDF
      </button>
      <a href={retourHref} className="text-sm font-medium text-indigo-600 hover:underline">
        Retour à l&apos;analyse
      </a>
      <p className="basis-full text-xs text-zinc-500">
        Dans la fenêtre d&apos;impression, choisissez « Enregistrer au format PDF » comme destination.
      </p>
    </div>
  );
}
