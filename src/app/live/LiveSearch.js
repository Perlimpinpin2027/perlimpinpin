"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "./ui";

// Recherche dans les analyses enregistrées. Un seul champ (SearchBar), ouvert
// depuis deux endroits (icône de la barre latérale, carte « Rechercher un
// sujet ») grâce à un état partagé. La requête vit dans l'URL (?q=) : la page
// serveur fait la recherche en base (aucune IA).

const MIN_LENGTH = 2;
const MAX_LENGTH = 100;

const SearchContext = createContext(null);

export function LiveSearchProvider({ query, children }) {
  const [open, setOpen] = useState(false);
  const [focusTick, setFocusTick] = useState(0);

  const value = {
    // Le champ reste visible tant qu'une recherche est affichée
    open: open || Boolean(query),
    query,
    focusTick,
    openSearch: () => {
      setOpen(true);
      setFocusTick((tick) => tick + 1);
    },
    closeSearch: () => setOpen(false),
  };
  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

// Bouton qui ouvre le champ de recherche et lui donne le focus. Le contenu
// (icône, libellé) est fourni par l'appelant : même logique, apparences
// différentes.
export function SearchTrigger({ children, ...props }) {
  const { openSearch } = useContext(SearchContext);
  return (
    <button type="button" onClick={openSearch} {...props}>
      {children}
    </button>
  );
}

// Efface la recherche en cours : ferme le champ et revient à la vue normale.
export function ClearSearchButton({ children, className = "" }) {
  const router = useRouter();
  const { closeSearch } = useContext(SearchContext);
  return (
    <button
      type="button"
      onClick={() => {
        closeSearch();
        router.push("/live");
      }}
      className={className}
    >
      {children}
    </button>
  );
}

// Le champ. À rendre avec key={requête} pour se réinitialiser quand la
// recherche change (navigation arrière, par exemple).
export function SearchBar() {
  const router = useRouter();
  const inputRef = useRef(null);
  const { open, query, focusTick, closeSearch } = useContext(SearchContext);
  const [value, setValue] = useState(query);

  // (Ré)ouverture demandée par l'icône ou la carte : focus sur le champ
  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    inputRef.current?.scrollIntoView?.({ block: "nearest" });
  }, [open, focusTick]);

  if (!open) return null;

  function submit(event) {
    event.preventDefault();
    const trimmed = value.trim();
    if (trimmed.length < MIN_LENGTH) return;
    router.push(`/live?q=${encodeURIComponent(trimmed)}`);
  }

  function clear() {
    setValue("");
    closeSearch();
    if (query) router.push("/live");
  }

  return (
    <form role="search" onSubmit={submit} className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-zinc-300 bg-white px-3 focus-within:ring-2 focus-within:ring-blue-200">
        <Icon name="search" className="h-5 w-5 shrink-0 text-zinc-400" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape" && !query) clear();
          }}
          minLength={MIN_LENGTH}
          maxLength={MAX_LENGTH}
          placeholder="Rechercher un candidat, un thème, un mot d'une déclaration…"
          aria-label="Rechercher dans les analyses"
          className="w-full bg-transparent py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={value.trim().length < MIN_LENGTH}
          className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Rechercher
        </button>
        <button
          type="button"
          onClick={clear}
          className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50"
        >
          {query ? "Effacer" : "Fermer"}
        </button>
      </div>
    </form>
  );
}
