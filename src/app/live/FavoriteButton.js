"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ICONS } from "./ui";

// Étoile cliquable : bascule le favori d'une analyse via
// PATCH /api/live/analyses/:id/favori (ce seul champ). Mise à jour
// optimiste, annulée si la requête échoue ; les listes serveur (historique,
// cartes, vue Favoris) sont ensuite rechargées.
export default function FavoriteButton({ id, favori, className = "" }) {
  const router = useRouter();
  const [isFavori, setIsFavori] = useState(favori);
  const [pending, setPending] = useState(false);

  // Resynchronisation avec la valeur serveur : après router.refresh(), les autres
  // exemplaires de l'étoile (barre latérale, cartes) reçoivent la nouvelle
  // valeur en prop, que le useState initial ignorerait sinon.
  const [propFavori, setPropFavori] = useState(favori);
  if (favori !== propFavori) {
    setPropFavori(favori);
    setIsFavori(favori);
  }

  async function toggle() {
    if (pending) return;
    const next = !isFavori;
    setIsFavori(next);
    setPending(true);
    try {
      const response = await fetch(`/api/live/analyses/${id}/favori`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favori: next }),
      });
      if (response.status === 401) {
        window.location.href = "/live/login";
        return;
      }
      if (!response.ok) throw new Error(String(response.status));
      router.refresh();
    } catch {
      setIsFavori(!next);
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={isFavori}
      aria-label={isFavori ? "Retirer des favoris" : "Ajouter aux favoris"}
      title={isFavori ? "Retirer des favoris" : "Ajouter aux favoris"}
      className={`shrink-0 rounded-md p-1 transition-colors hover:bg-zinc-100 ${
        isFavori ? "text-amber-500" : "text-zinc-300 hover:text-zinc-500"
      } ${className}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill={isFavori ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
        aria-hidden="true"
      >
        <path d={ICONS.star} />
      </svg>
    </button>
  );
}
