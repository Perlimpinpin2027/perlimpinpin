const popularTags = [
  "Pouvoir d'achat",
  "Retraites",
  "Immigration",
  "Dette publique",
  "Énergie",
];

export default function SearchBar() {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <form className="flex items-center gap-3 rounded-full bg-white p-2 pl-6 shadow-sm">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5 shrink-0 text-zinc-400"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>

        <input
          type="search"
          placeholder="Rechercher une déclaration, un candidat, un thème..."
          className="w-full bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
        />

        <button
          type="submit"
          className="shrink-0 rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-zinc-800"
        >
          Rechercher
        </button>
      </form>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm">
        <span className="text-zinc-500">Exemples populaires :</span>
        {popularTags.map((tag) => (
          <button
            key={tag}
            type="button"
            className="rounded-full bg-zinc-100 px-4 py-1.5 text-zinc-700 transition-colors hover:bg-zinc-200"
          >
            {tag}
          </button>
        ))}
      </div>
    </div>
  );
}
