import Link from "next/link";
import { getPublishedThemes } from "@/lib/queries";

export default async function ThemeTags() {
  const themes = await getPublishedThemes();

  if (themes.length === 0) return null;

  // Une seule ligne de thèmes : les pastilles qui ne tiennent pas passent
  // sur une 2e ligne, masquée (hauteur fixe + overflow-hidden). On n'affiche
  // ainsi que des pastilles entières, quelle que soit la largeur d'écran.
  return (
    <div className="flex w-full items-center gap-3 text-sm">
      <span className="flex shrink-0 items-center gap-1.5 font-medium text-zinc-500">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          className="h-4 w-4 text-zinc-400"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z"
          />
        </svg>
        <span className="hidden sm:inline">Thèmes populaires :</span>
      </span>
      <div className="flex h-8 min-w-0 flex-1 flex-wrap items-center gap-2 overflow-hidden">
        {themes.map((theme) => (
          <Link
            key={theme}
            href={`/declarations?theme=${encodeURIComponent(theme)}`}
            prefetch={false}
            className="whitespace-nowrap rounded-full bg-zinc-100 px-4 py-1.5 text-zinc-700 transition-colors hover:bg-zinc-200"
          >
            {theme}
          </Link>
        ))}
      </div>
      <Link
        href="/themes"
        className="shrink-0 whitespace-nowrap font-semibold text-zinc-500 transition-colors hover:text-zinc-900"
      >
        Voir tous les thèmes →
      </Link>
    </div>
  );
}
