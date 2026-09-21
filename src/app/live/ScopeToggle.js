"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { SCOPES, SCOPE_LABELS } from "@/lib/live-scope";
import { setScope } from "./actions";

// Choix de la portée des listes : « Mes analyses » (défaut) ou « Toutes les analyses »
// de l'équipe. S'applique à l'historique, aux analyses récentes, aux dossiers et à la
// recherche ; les favoris restent personnels. Le choix est mémorisé (cookie) puis les
// listes serveur sont rechargées.
export default function ScopeToggle({ scope, className = "" }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(value) {
    if (value === scope || pending) return;
    startTransition(async () => {
      await setScope(value);
      router.refresh();
    });
  }

  return (
    <div
      role="group"
      aria-label="Portée des analyses"
      aria-busy={pending}
      className={`inline-flex rounded-full bg-zinc-100 p-0.5 text-xs font-medium ${pending ? "opacity-60" : ""} ${className}`}
    >
      {SCOPES.map((value) => (
        <button
          key={value}
          type="button"
          aria-pressed={value === scope}
          disabled={pending}
          onClick={() => choose(value)}
          className={`rounded-full px-3 py-1 transition-colors ${
            value === scope ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-800"
          }`}
        >
          {SCOPE_LABELS[value]}
        </button>
      ))}
    </div>
  );
}
