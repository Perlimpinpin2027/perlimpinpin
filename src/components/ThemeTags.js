import Link from "next/link";
import { getPublishedThemes } from "@/lib/queries";

export default async function ThemeTags() {
  const themes = await getPublishedThemes();

  if (themes.length === 0) return null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-center gap-2 text-sm">
      <span className="text-zinc-500">Thèmes populaires :</span>
      {themes.map((theme) => (
        <Link
          key={theme}
          href={`/declarations?theme=${encodeURIComponent(theme)}`}
          className="rounded-full bg-zinc-100 px-4 py-1.5 text-zinc-700 transition-colors hover:bg-zinc-200"
        >
          {theme}
        </Link>
      ))}
    </div>
  );
}
