"use client";

import { useId, useState } from "react";

// Bloc dépliable des cartes de /candidats (« Rémunérations et moyens »,
// « Condamnations pénales »). Fermé par défaut ; chaque bloc a son propre
// état, ouvrir l'un ne ferme pas l'autre.
//
// Le contenu reste dans le DOM pour l'animation (hauteur via grid-rows 0fr →
// 1fr, plus un fondu) ; `inert` le retire du clavier et des lecteurs d'écran
// tant qu'il est replié. Animation coupée si l'appareil demande moins de
// mouvement.
export default function Depliable({ libelle, classeBouton = "", children }) {
  const [ouvert, setOuvert] = useState(false);
  const idContenu = useId();

  return (
    <div>
      <button
        type="button"
        aria-expanded={ouvert}
        aria-controls={idContenu}
        onClick={() => setOuvert((valeur) => !valeur)}
        className={`cursor-pointer rounded text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 ${classeBouton}`}
      >
        {libelle} <span aria-hidden="true">{ouvert ? "▴" : "▾"}</span>
      </button>
      <div
        id={idContenu}
        inert={!ouvert}
        className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none ${
          ouvert ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="min-h-0 overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
