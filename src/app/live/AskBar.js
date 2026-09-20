import { ComingSoon, Icon } from "./ui";

// Barre « Posez une question sur cette analyse… » et ses suggestions : affichées
// mais inactives (le chat sera branché dans une phase ultérieure).
const SUGGESTIONS = ["Quel est le coût estimé ?", "Est-ce légal ?", "Comparez avec d'autres pays", "Trouvez les faiblesses"];

export default function AskBar() {
  return (
    <section aria-label="Poser une question sur cette analyse" className="mt-10">
      <ComingSoon className="w-full">
        <div className="flex w-full cursor-not-allowed items-center gap-3 rounded-full border border-zinc-200 bg-white px-3 py-2 opacity-70">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-200 text-zinc-400">
            <Icon name="plus" className="h-4 w-4" />
          </span>
          <input
            type="text"
            disabled
            placeholder="Posez une question sur cette analyse…"
            aria-label="Poser une question sur cette analyse (bientôt disponible)"
            className="min-w-0 flex-1 cursor-not-allowed bg-transparent text-sm text-zinc-500 placeholder:text-zinc-400 focus:outline-none"
          />
          <span className="hidden shrink-0 rounded-full bg-zinc-200/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 sm:inline">
            Bientôt disponible
          </span>
          <button
            type="button"
            disabled
            aria-label="Envoyer"
            className="flex h-9 w-9 shrink-0 cursor-not-allowed items-center justify-center rounded-full bg-zinc-300 text-white"
          >
            <Icon name="arrowUp" className="h-4 w-4" />
          </button>
        </div>
      </ComingSoon>
      <ul className="mt-3 flex flex-wrap gap-2">
        {SUGGESTIONS.map((suggestion) => (
          <li key={suggestion}>
            <ComingSoon>
              <button
                type="button"
                disabled
                className="cursor-not-allowed rounded-full border border-zinc-200 bg-white/70 px-3 py-1.5 text-xs text-zinc-400"
              >
                {suggestion}
              </button>
            </ComingSoon>
          </li>
        ))}
      </ul>
    </section>
  );
}
