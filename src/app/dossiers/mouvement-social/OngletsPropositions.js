"use client";

import { useState } from "react";
import { DOSSIER } from "@/lib/couleurs-dossier";

// Onglets des propositions du dossier « Mouvement social » : un onglet par
// levier (`onglets` du JSON). Les propositions (`propositions` du JSON, champ
// `onglet` = `id` de l'onglet) seront ajoutées une à une : tant qu'un onglet
// n'en a aucune, il affiche `messageOngletVide`. L'affichage des cartes de
// proposition (regroupées par candidat, note lue depuis la fiche publiée)
// viendra avec les premières propositions.
export default function OngletsPropositions({ onglets, propositions, messageOngletVide }) {
  const [actif, setActif] = useState(onglets[0]?.id);
  const onglet = onglets.find((o) => o.id === actif) ?? onglets[0];
  if (!onglet) return null;
  const propositionsOnglet = propositions.filter((p) => p.onglet === onglet.id);

  // Flèches gauche/droite pour passer d'un onglet à l'autre (motif ARIA
  // « tabs ») ; le focus suit l'onglet activé.
  function auClavier(event, index) {
    const decalage = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!decalage) return;
    event.preventDefault();
    const suivant = onglets[(index + decalage + onglets.length) % onglets.length];
    setActif(suivant.id);
    document.getElementById(`onglet-${suivant.id}`)?.focus();
  }

  return (
    <div className="flex flex-col gap-5">
      <div role="tablist" className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {onglets.map((o, index) => {
          const estActif = o.id === onglet.id;
          return (
            <button
              key={o.id}
              id={`onglet-${o.id}`}
              type="button"
              role="tab"
              aria-selected={estActif}
              aria-controls={`panneau-${o.id}`}
              tabIndex={estActif ? 0 : -1}
              onClick={() => setActif(o.id)}
              onKeyDown={(event) => auClavier(event, index)}
              className={`flex items-start gap-3 rounded-2xl border-2 bg-white p-5 text-left transition-colors ${
                estActif ? `${DOSSIER.bordure}` : "border-zinc-200 hover:border-zinc-300"
              }`}
            >
              <span
                aria-hidden="true"
                className={`flex h-8 w-8 flex-none items-center justify-center rounded-full text-sm font-extrabold ${
                  estActif ? `${DOSSIER.fond} text-zinc-950` : "bg-zinc-100 text-zinc-500"
                }`}
              >
                {o.id}
              </span>
              <span className={`text-base font-bold leading-snug ${estActif ? "text-zinc-950" : "text-zinc-600"}`}>
                {o.titre}
              </span>
            </button>
          );
        })}
      </div>

      <div
        id={`panneau-${onglet.id}`}
        role="tabpanel"
        aria-labelledby={`onglet-${onglet.id}`}
        className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8"
      >
        <h3 className="text-[22px] font-bold tracking-tight text-zinc-900">{onglet.titre}</h3>
        <p className="max-w-3xl text-base leading-relaxed text-slate-500">{onglet.description}</p>
        {propositionsOnglet.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-5 py-4 text-[15px] leading-relaxed text-zinc-500">
            {messageOngletVide}
          </p>
        ) : null}
        {/* Repères de l'onglet (`reperes` du JSON), sur fond bleu très pâle,
            chaque point suivi de sa source. */}
        {onglet.reperes?.items?.length ? (
          <div className="flex flex-col gap-3 rounded-2xl bg-blue-50/70 px-5 py-4 sm:px-6 sm:py-5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-950">{onglet.reperes.titre}</p>
            <ul className="flex list-disc flex-col gap-2 pl-5 text-[15px] leading-relaxed text-zinc-700">
              {onglet.reperes.items.map((repere) => (
                <li key={repere.texte}>
                  {repere.texte}
                  {repere.source?.url ? (
                    <>
                      {" "}
                      <a
                        href={repere.source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="whitespace-nowrap text-xs text-zinc-400 underline decoration-zinc-300 underline-offset-2 hover:text-zinc-700"
                      >
                        {repere.source.label} <span aria-hidden="true">↗</span>
                      </a>
                    </>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
