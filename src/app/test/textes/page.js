import Link from "next/link";
import Header from "@/components/Header";
import MonoTag from "@/components/MonoTag";
import { PAGES_EDITABLES } from "@/lib/textes-site";

export const metadata = {
  title: "Textes du site — Perlimpinpin",
  robots: { index: false, follow: false },
};

// Liste des pages publiques dont les textes sont modifiables.
export default function TextesPage() {
  const pages = Object.entries(PAGES_EDITABLES);

  return (
    <div className="flex min-h-screen flex-col bg-page-gradient font-sans">
      <Header />

      <main className="w-full px-6 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
          <div>
            <MonoTag>Textes du site</MonoTag>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-5xl">
              Pages modifiables
            </h1>
          </div>

          <ul className="flex flex-col gap-3">
            {pages.map(([page, definition]) => (
              <li key={page}>
                <Link
                  href={`/test/textes/${page}`}
                  className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white/70 p-5 transition-opacity hover:opacity-70"
                >
                  <span className="text-base font-semibold text-zinc-900">{definition.nom}</span>
                  <span className="font-mono text-xs text-zinc-400">
                    {definition.chemin} · {definition.champs.length} textes
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  );
}
