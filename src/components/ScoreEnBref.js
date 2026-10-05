import { criteresPrincipaux, pourcentage } from "@/lib/criteresScore";

// Récap compact "En bref" de la carte score (StickyScoreCard) : les 5
// critères principaux du barème 2026, sans les volets d'Opérationnalité ni
// la pastille "Somme de 3 volets". Mêmes données, largeurs et couleurs que
// "Détail du score" (src/lib/criteresScore.js).
export default function ScoreEnBref({ notation }) {
  return (
    <div className="mt-5 border-t border-zinc-100 pt-4">
      <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">En bref</span>
      <ul className="mt-3 flex flex-col gap-3">
        {criteresPrincipaux(notation).map(({ key, label, note, max, bar, badge }) => (
          <li key={key}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm text-zinc-900">{label}</span>
              <span className="shrink-0 font-mono text-sm">
                <span className="font-semibold text-zinc-900">{note ?? "—"}</span>
                <span className="text-zinc-400">/{max}</span>
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-zinc-100">
                <div className={`h-full rounded-full ${bar}`} style={{ width: `${pourcentage(note, max)}%` }} />
              </div>
              {badge ? (
                <span
                  className={`inline-flex shrink-0 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none ${badge.className}`}
                >
                  {badge.label}
                </span>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
