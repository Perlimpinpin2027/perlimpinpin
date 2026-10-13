"use client";

import { useState } from "react";

// Boutons « Copier » et « Ouvrir dans X » d'un tweet (page de partage
// /test/reseaux/[id]). « Ouvrir dans X » préremplit le texte ; l'image se
// joint à la main. Rien n'est publié automatiquement.
export default function BoutonsTweet({ texte, lienX }) {
  const [copie, setCopie] = useState(null);

  async function copier() {
    try {
      await navigator.clipboard.writeText(texte);
      setCopie("Copié");
    } catch {
      setCopie("Copie impossible : sélectionnez le texte à la main");
    }
    setTimeout(() => setCopie(null), 2500);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={copier}
        className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-zinc-800"
      >
        Copier
      </button>
      <a
        href={lienX}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-semibold text-zinc-800 transition-colors hover:bg-zinc-100"
      >
        Ouvrir dans X
      </a>
      {copie ? (
        <span role="status" className="text-xs text-zinc-600">
          {copie}
        </span>
      ) : null}
    </div>
  );
}
