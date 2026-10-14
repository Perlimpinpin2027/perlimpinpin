"use client";

import { useState } from "react";
import { LONGUEUR_X_CONSEILLEE, lienIntentionX, longueurX, niveauLongueur } from "@/lib/reseaux";

// Tweet modifiable de la page de partage (/test/reseaux/[id]) : zone de texte
// préremplie, compteur de caractères X mis à jour en direct (orange au-delà de
// 280, rouge au-delà de 4 000), boutons « Copier » et « Ouvrir dans X » sur le
// texte modifié. Rien n'est écrit en base ni publié : la modification ne vit
// que dans cette page (perdue au rechargement).
const COULEURS = {
  ok: { compteur: "", cadre: "border-zinc-200" },
  long: { compteur: "font-semibold text-orange-700", cadre: "border-orange-300" },
  limite: { compteur: "font-semibold text-red-700", cadre: "border-red-300" },
};

export default function TweetModifiable({ numero, texteInitial }) {
  const [texte, setTexte] = useState(texteInitial);
  const [copie, setCopie] = useState(null);
  const longueur = longueurX(texte);
  const { niveau, note } = niveauLongueur(longueur);
  const modifie = texte !== texteInitial;

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
    <li className={`flex flex-col gap-2 rounded-xl border bg-white p-4 ${COULEURS[niveau].cadre}`}>
      <div className="flex items-center justify-between gap-2 text-xs text-zinc-500">
        <span className="font-semibold uppercase tracking-wide">
          {numero}
          {modifie ? <span className="ml-2 normal-case text-amber-700">modifié</span> : null}
        </span>
        <span aria-live="polite" className={COULEURS[niveau].compteur}>
          {longueur} / {LONGUEUR_X_CONSEILLEE}
          {note ? ` · ${note}` : ""}
        </span>
      </div>
      <textarea
        value={texte}
        onChange={(event) => setTexte(event.target.value)}
        rows={Math.max(4, texte.split("\n").length + 1)}
        aria-label={`Texte du ${numero.toLowerCase()}`}
        className="w-full resize-y rounded-lg border border-zinc-200 p-2 text-sm leading-relaxed text-zinc-900 focus:border-zinc-400 focus:outline-none"
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={copier}
          className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-zinc-800"
        >
          Copier
        </button>
        <a
          href={lienIntentionX(texte)}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-semibold text-zinc-800 transition-colors hover:bg-zinc-100"
        >
          Ouvrir dans X
        </a>
        {modifie ? (
          <button
            type="button"
            onClick={() => setTexte(texteInitial)}
            className="text-xs font-semibold text-zinc-600 underline underline-offset-2 hover:text-zinc-900"
          >
            Revenir au texte proposé
          </button>
        ) : null}
        {copie ? (
          <span role="status" className="text-xs text-zinc-600">
            {copie}
          </span>
        ) : null}
      </div>
    </li>
  );
}
