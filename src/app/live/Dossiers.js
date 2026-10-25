import Link from "next/link";
import { GO_CARD, Icon } from "./ui";

// Cartes de dossiers : un par thème présent en base (regroupement automatique
// des analyses). Un clic filtre les analyses sur ce thème ; la carte du dossier
// actif est en noir (un second clic retire le filtre).
export default function Dossiers({ dossiers, actif = null, limit = null }) {
  const visibles = limit ? dossiers.slice(0, limit) : dossiers;

  return (
    <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {visibles.map((dossier) => {
        const isActive = dossier.slug === actif;
        return (
          <li key={dossier.slug}>
            <Link
              href={isActive ? "/live" : `/live?dossier=${dossier.slug}`}
              aria-current={isActive ? "true" : undefined}
              title={isActive ? "Retirer le filtre" : `Filtrer sur « ${dossier.label} »`}
              className={`flex h-full items-center gap-4 px-5 py-4 transition-colors ${
                isActive
                  ? "rounded-2xl border border-zinc-900 bg-zinc-900 text-white"
                  : `${GO_CARD} text-zinc-900 hover:border-zinc-300 hover:bg-white`
              }`}
            >
              <Icon name="folder" className={`h-7 w-7 shrink-0 ${isActive ? "text-white" : "text-blue-600"}`} />
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 text-[15px] font-semibold leading-snug">{dossier.label}</span>
                <span className={`mt-0.5 block text-sm ${isActive ? "text-zinc-300" : "text-zinc-500"}`}>
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
