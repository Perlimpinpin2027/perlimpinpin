"use client";

import { useMemo, useState } from "react";
import CandidatCard from "@/components/CandidatCard";
import { normaliser } from "@/lib/recherche";

// Grille des cartes de la page /candidats, avec recherche et tri. Tout se
// fait dans le navigateur, sur les cartes déjà chargées par la page : aucune
// requête supplémentaire pendant la frappe ou au changement de tri.

const TRIS = [
  { valeur: "score-desc", libelle: "Score décroissant" },
  { valeur: "score-asc", libelle: "Score croissant" },
  { valeur: "alpha", libelle: "Ordre alphabétique" },
];

// Clé de tri alphabétique : nom de famille sans sa particule (« de Villepin »
// classé à V, comme dans un annuaire).
function cleNom(nom) {
  return nom.replace(/^(de la |de l'|de l’|du |des |de |d'|d’)/i, "");
}

function compareNoms(a, b) {
  return cleNom(a.parcours.nom).localeCompare(cleNom(b.parcours.nom), "fr", { sensitivity: "base" });
}

// Tris par score : candidats sans fiche publiée ("Analyse en cours")
// toujours en fin de liste, par ordre alphabétique entre eux.
function trier(cartes, tri) {
  return [...cartes].sort((a, b) => {
    if (tri === "alpha") return compareNoms(a, b);
    const scoreA = a.score?.scoreMoyen ?? null;
    const scoreB = b.score?.scoreMoyen ?? null;
    if (scoreA == null || scoreB == null) {
      if (scoreA == null && scoreB == null) return compareNoms(a, b);
      return scoreA == null ? 1 : -1;
    }
    const ecart = tri === "score-asc" ? scoreA - scoreB : scoreB - scoreA;
    return ecart || compareNoms(a, b);
  });
}

export default function CandidatsGrille({ cartes }) {
  const [recherche, setRecherche] = useState("");
  const [tri, setTri] = useState("score-desc");

  // Texte indexé une fois par carte : prénom, nom et parti, sans accents.
  const indexees = useMemo(
    () =>
      cartes.map((carte) => ({
        ...carte,
        texte: normaliser(`${carte.parcours.prenom} ${carte.parcours.nom} ${carte.parcours.parti}`),
      })),
    [cartes],
  );

  const affichees = useMemo(() => {
    const requete = normaliser(recherche);
    const filtrees = requete
      ? indexees.filter((carte) => carte.texte.includes(requete))
      : indexees;
    return trier(filtrees, tri);
  }, [indexees, recherche, tri]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Rechercher un candidat</span>
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="search"
            value={recherche}
            onChange={(event) => setRecherche(event.target.value)}
            placeholder="Rechercher un candidat…"
            className="h-12 w-full rounded-xl border border-zinc-200 bg-white pl-12 pr-4 text-base text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
          />
        </label>

        <label className="relative sm:w-56">
          <span className="sr-only">Trier les candidats</span>
          <select
            value={tri}
            onChange={(event) => setTri(event.target.value)}
            className="h-12 w-full cursor-pointer appearance-none rounded-xl bg-zinc-900 pl-4 pr-10 text-sm font-semibold text-white outline-none transition hover:bg-zinc-800 focus:ring-4 focus:ring-zinc-300"
          >
            {TRIS.map(({ valeur, libelle }) => (
              <option key={valeur} value={valeur}>
                {libelle}
              </option>
            ))}
          </select>
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </label>
      </div>

      {affichees.length ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {affichees.map(({ parcours, score }) => (
            <CandidatCard key={parcours.slug} parcours={parcours} score={score} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-zinc-200 bg-white px-6 py-12 text-center">
          <p className="text-sm text-zinc-500">Aucun candidat ne correspond à votre recherche.</p>
          <button
            type="button"
            onClick={() => setRecherche("")}
            className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-50"
          >
            Effacer la recherche
          </button>
        </div>
      )}
    </div>
  );
}
