import Link from "next/link";

// Barre de recherche par mots-clés (maquette de la page d'accueil).
// Simple formulaire HTML : « Entrée » ou la flèche envoie vers
// /declarations?q=..., qui affiche les propositions analysées correspondantes
// (filtre dans src/lib/queries.js -> getPublishedDeclarations). Fonctionne
// sans JavaScript et n'ajoute aucun appel réseau à la page d'accueil.
export default function SearchBar({
  placeholder = "Rechercher une proposition, un candidat, un thème…",
  defaultValue = "",
  exemples = [],
  exemplesTitre = "Exemples :",
  autres = {},
}) {
  return (
    <div className="w-full">
      <form action="/declarations" method="get" role="search" className="relative">
        {/* Filtres déjà actifs (page /declarations) conservés lors d'une
            nouvelle recherche. */}
        {Object.entries(autres).map(([cle, valeur]) => (
          <input key={cle} type="hidden" name={cle} value={valeur} />
        ))}
        <label htmlFor="recherche-q" className="sr-only">
          Rechercher dans les propositions analysées
        </label>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className="pointer-events-none absolute left-6 top-1/2 h-6 w-6 -translate-y-1/2 text-zinc-900"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path strokeLinecap="round" d="m20 20-3.5-3.5" />
        </svg>
        <input
          id="recherche-q"
          type="search"
          name="q"
          defaultValue={defaultValue}
          placeholder={placeholder}
          autoComplete="off"
          enterKeyHint="search"
          className="h-16 w-full rounded-full border border-zinc-200 bg-white pl-16 pr-16 sm:pr-20 text-base text-zinc-900 shadow-[0_18px_40px_-20px_rgba(30,41,82,0.35)] outline-none transition placeholder:text-slate-400 max-sm:placeholder:text-[15px] focus:border-blue-300 focus:ring-4 focus:ring-blue-100 sm:h-[72px] sm:text-lg [&::-webkit-search-cancel-button]:hidden"
        />
        <button
          type="submit"
          aria-label="Lancer la recherche"
          className="absolute right-2 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-gradient-to-br from-sky-100 via-violet-100 to-rose-100 text-zinc-900 transition hover:brightness-95 sm:h-14 sm:w-14"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="h-6 w-6"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m0 0-6-6m6 6-6 6" />
          </svg>
        </button>
      </form>

      {exemples.length > 0 ? (
        <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 pl-2 font-mono text-xs text-slate-500">
          <span>{exemplesTitre}</span>
          {exemples.map((exemple, index) => (
            <span key={exemple} className="flex items-center gap-2">
              {index > 0 ? <span aria-hidden="true">·</span> : null}
              <Link
                href={`/declarations?q=${encodeURIComponent(exemple)}`}
                prefetch={false}
                className="transition-colors hover:text-zinc-900 hover:underline"
              >
                {exemple}
              </Link>
            </span>
          ))}
        </p>
      ) : null}
    </div>
  );
}
