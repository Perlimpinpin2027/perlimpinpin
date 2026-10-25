"use client";

import { useState } from "react";

// Onglets des propositions du dossier « Mouvement social » : un onglet par
// levier (`onglets` du JSON). Dans chaque onglet, les propositions
// (`propositions` du JSON, champ `onglet` = `id` de l'onglet) sont regroupées
// par candidat, dans l'ordre de `nomTri` (`groupesParOnglet`, préparé côté
// serveur). Une proposition dont la fiche est publiée en base (`fiche`, lue
// par la page, jamais recopiée dans le JSON) affiche sa note, son
// appréciation, son résumé, ses notes par critère et sa conclusion ; sinon
// « Analyse à venir ». Sous la liste, les repères de l'onglet.

// Proposition sans fiche publiée : libellé fixe, sans note provisoire.
const ANALYSE_A_VENIR = "Analyse à venir";

function CarteProposition({ proposition }) {
  const { fiche } = proposition;
  return (
    <li className="flex flex-col gap-3 border-t border-(--ms-gris200) py-5 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-center gap-2">
        {proposition.statut ? (
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${proposition.statut.classe}`}>
            {proposition.statut.label}
          </span>
        ) : null}
        {proposition.dateAffichee ? (
          <span className="font-mono text-xs uppercase tracking-[0.06em] text-(--ms-gris600)">{proposition.dateAffichee}</span>
        ) : null}
        {proposition.source?.url ? (
          <a
            href={proposition.source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-(--ms-gris600) underline decoration-(--ms-gris400) underline-offset-2 hover:text-(--ms-noir)"
          >
            {proposition.source.label} <span aria-hidden="true">↗</span>
          </a>
        ) : null}
      </div>
      <p className="text-lg font-bold leading-snug text-(--ms-noir)">{proposition.intitule}</p>
      {proposition.description ? (
        <p className="max-w-3xl text-[15px] leading-relaxed text-(--ms-gris900)">{proposition.description}</p>
      ) : null}

      {fiche ? (
        <div className="flex flex-col gap-3 rounded-xl border border-(--ms-gris200) bg-(--ms-gris50) p-4 sm:p-5">
          <div className="flex flex-wrap items-baseline gap-3">
            <span className={`text-3xl font-black tracking-[-0.03em] ${fiche.classeScore}`}>
              {fiche.score}
              <span className="text-base font-semibold text-(--ms-gris600)">/100</span>
            </span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${fiche.classeBadge}`}>{fiche.appreciation}</span>
          </div>
          {fiche.resume ? <p className="text-[15px] leading-relaxed text-(--ms-gris900)">{fiche.resume}</p> : null}
          {fiche.criteres?.length ? (
            <ul className="grid grid-cols-1 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
              {fiche.criteres.map((critere) => (
                <li key={critere.label} className="flex items-baseline justify-between gap-3 border-b border-(--ms-gris200) py-1">
                  <span className="text-(--ms-gris600)">{critere.label}</span>
                  <strong className="whitespace-nowrap font-semibold text-(--ms-noir)">
                    {critere.note}/{critere.max}
                  </strong>
                </li>
              ))}
            </ul>
          ) : null}
          {fiche.conclusion ? <p className="text-[15px] italic leading-relaxed text-(--ms-gris900)">{fiche.conclusion}</p> : null}
          <a
            href={fiche.url}
            className="w-fit text-sm font-semibold text-(--ms-noir) underline decoration-(--ms-jaune) decoration-2 underline-offset-4"
          >
            Lire la fiche complète <span aria-hidden="true">→</span>
          </a>
        </div>
      ) : (
        <p className="w-fit rounded-full border border-dashed border-(--ms-gris400) px-3 py-1 text-xs font-semibold text-(--ms-gris600)">
          {ANALYSE_A_VENIR}
        </p>
      )}
    </li>
  );
}

export default function OngletsPropositions({ onglets, groupesParOnglet, messageOngletVide }) {
  const [actif, setActif] = useState(onglets[0]?.id);
  const onglet = onglets.find((o) => o.id === actif) ?? onglets[0];
  if (!onglet) return null;
  const groupes = groupesParOnglet[onglet.id] ?? [];

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
                estActif ? "border-(--ms-noir)" : "border-(--ms-gris200) hover:border-(--ms-gris400)"
              }`}
            >
              <span
                aria-hidden="true"
                className={`flex h-8 w-8 flex-none items-center justify-center rounded-md font-mono text-sm font-bold ${
                  estActif ? "bg-(--ms-jaune) text-(--ms-noir)" : "bg-(--ms-gris200) text-(--ms-gris600)"
                }`}
              >
                {o.id}
              </span>
              <span className={`text-base font-bold leading-snug ${estActif ? "text-(--ms-noir)" : "text-(--ms-gris600)"}`}>
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
        className="flex flex-col gap-5 rounded-2xl border border-(--ms-gris200) bg-white p-6 sm:p-8"
      >
        <h3 className="text-[22px] font-extrabold tracking-[-0.02em] text-(--ms-noir)">{onglet.titre}</h3>
        <p className="max-w-3xl text-base leading-relaxed text-(--ms-gris600)">{onglet.description}</p>

        {groupes.length === 0 ? (
          <p className="rounded-xl border border-dashed border-(--ms-gris400) bg-(--ms-gris50) px-5 py-4 text-[15px] leading-relaxed text-(--ms-gris600)">
            {messageOngletVide}
          </p>
        ) : (
          <div className="flex flex-col gap-8">
            {groupes.map((groupe) => (
              <div key={groupe.candidat} className="flex flex-col gap-4">
                <div className="flex flex-wrap items-baseline gap-x-2 border-b-2 border-(--ms-noir) pb-2">
                  <p className="text-lg font-extrabold text-(--ms-noir)">{groupe.candidat}</p>
                  {groupe.parti ? <p className="text-sm text-(--ms-gris600)">{groupe.parti}</p> : null}
                </div>
                <ul className="flex flex-col">
                  {groupe.propositions.map((proposition) => (
                    <CarteProposition key={proposition.id} proposition={proposition} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {/* Repères de l'onglet (`reperes` du JSON) : chaque point renvoie
            vers la partie du dossier qui le détaille. */}
        {onglet.reperes?.items?.length ? (
          <div className="flex flex-col gap-3 rounded-r-2xl border-l-4 border-(--ms-jaune) bg-(--ms-jaunePale) px-5 py-4 sm:px-6 sm:py-5">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.1em] text-(--ms-noir)">{onglet.reperes.titre}</p>
            <ul className="flex list-disc flex-col gap-2 pl-5 text-[15px] leading-relaxed text-(--ms-gris900)">
              {onglet.reperes.items.map((repere) => (
                <li key={repere.texte}>
                  {repere.texte}
                  {repere.renvoi ? (
                    <>
                      {" "}
                      <a
                        href={repere.renvoi}
                        className="whitespace-nowrap text-sm font-semibold text-(--ms-noir) underline decoration-(--ms-jaune) decoration-2 underline-offset-2"
                      >
                        → voir
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
