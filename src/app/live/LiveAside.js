import { ComingSoon, Icon } from "./ui";

// Suggestions qui seront branchées plus tard (Phase 6) : affichées mais
// inactives pour l'instant.
const SUGGESTIONS = [
  { icon: "microphone", label: "Préparer une interview" },
  { icon: "compare", label: "Comparer des déclarations" },
  { icon: "search", label: "Rechercher un sujet" },
];

export default function LiveAside() {
  return (
    <aside className="flex flex-col gap-5 border-t border-zinc-200 bg-white px-5 py-6 lg:border-l lg:border-t-0 lg:px-6 lg:py-8">
      <div>
        <p className="font-mono text-sm font-bold tracking-widest text-zinc-900">
          PerlimpinpinGo
        </p>
        <p className="mt-1 text-sm leading-relaxed text-zinc-500">
          Un outil d&apos;analyse pour les journalistes.
        </p>
      </div>

      <ul className="flex flex-col gap-2">
        {SUGGESTIONS.map((suggestion) => (
          <li key={suggestion.label}>
            <ComingSoon className="w-full">
              <button
                type="button"
                disabled
                className="flex w-full cursor-not-allowed items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-left text-sm font-medium text-zinc-400"
              >
                <Icon name={suggestion.icon} />
                <span className="flex-1">{suggestion.label}</span>
                <span className="rounded-full bg-zinc-200/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                  Bientôt
                </span>
              </button>
            </ComingSoon>
          </li>
        ))}
      </ul>

      <div className="rounded-xl bg-amber-50 px-4 py-4">
        <div className="flex items-center gap-2 text-amber-800">
          <Icon name="bulb" className="h-5 w-5" />
          <p className="text-sm font-semibold">Conseil</p>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-amber-900">
          Collez la déclaration telle que le candidat l&apos;a prononcée, avec ses chiffres exacts et
          son contexte (sujet, date, interlocuteur). Plus le passage est précis et complet, plus
          l&apos;estimation est fiable : évitez les paraphrases et les citations tronquées.
        </p>
      </div>
    </aside>
  );
}
