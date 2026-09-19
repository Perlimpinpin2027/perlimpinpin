import Link from "next/link";
import { Icon } from "./ui";

// Grille de dossiers : un par thème présent en base (regroupement
// automatique des analyses). Un clic filtre les analyses sur ce thème.
export default function Dossiers({ dossiers, actif = null, limit = null }) {
  const visibles = limit ? dossiers.slice(0, limit) : dossiers;

  return (
    <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {visibles.map((dossier) => {
        const isActive = dossier.slug === actif;
        return (
          <li key={dossier.slug}>
            <Link
              href={isActive ? "/live" : `/live?dossier=${dossier.slug}`}
              aria-current={isActive ? "true" : undefined}
              title={isActive ? "Retirer le filtre" : `Filtrer sur « ${dossier.label} »`}
              className={`flex h-full items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
                isActive
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-200 bg-white text-zinc-800 hover:border-zinc-300 hover:bg-zinc-50"
              }`}
            >
              <Icon name="folder" className={`h-5 w-5 shrink-0 ${isActive ? "text-white" : "text-indigo-400"}`} />
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 text-sm font-medium leading-snug">{dossier.label}</span>
                <span className={`mt-0.5 block text-xs ${isActive ? "text-zinc-300" : "text-zinc-400"}`}>
                  {dossier.count} {dossier.count > 1 ? "analyses" : "analyse"}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
