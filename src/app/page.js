import Link from "next/link";
import Header from "@/components/Header";
import HeroText from "@/components/HeroText";
import FeaturedCarousel from "@/components/FeaturedCarousel";
import ThemeTags from "@/components/ThemeTags";
import BottomColumns from "@/components/BottomColumns";
import {
  getFeaturedRotation,
  getTopDeclarations,
  getCandidateRanking,
} from "@/lib/queries";

// La page dépend de données Neon qui changent (analyses publiées, scores) —
// rendu dynamique à chaque requête plutôt que figé au build.
export const dynamic = "force-dynamic";

export default async function Home() {
  const [featuredRotation, topDeclarations, rankedCandidates] =
    await Promise.all([
      getFeaturedRotation(),
      getTopDeclarations(3),
      getCandidateRanking(7),
    ]);

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans">
      <Header />

      <section className="w-full px-6 py-10 sm:px-8 sm:py-14">
        <div className="mx-auto grid w-full max-w-[1280px] grid-cols-1 items-start gap-8 lg:grid-cols-[2fr_3fr] lg:gap-10">
          <HeroText />
          <FeaturedCarousel items={featuredRotation} />
        </div>
      </section>

      <section className="w-full px-6 pb-10 sm:px-8">
        <div className="mx-auto w-full max-w-[1280px]">
          <ThemeTags />
        </div>
      </section>

      <section className="w-full px-6 pb-10 sm:px-8">
        <div className="mx-auto w-full max-w-[1280px]">
          <BottomColumns
            topDeclarations={topDeclarations}
            rankedCandidates={rankedCandidates}
          />
        </div>
      </section>

      <section className="w-full px-6 pb-16 sm:px-8 sm:pb-20">
        <div className="mx-auto flex w-full max-w-[1280px] flex-col items-start justify-between gap-4 rounded-2xl border border-zinc-200 bg-white p-6 sm:flex-row sm:items-center sm:p-8">
          <div className="flex items-start gap-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              className="mt-0.5 h-6 w-6 shrink-0 text-blue-600"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
              />
            </svg>
            <div>
              <p className="text-sm font-bold text-zinc-900">
                Transparence et indépendance
              </p>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-zinc-500">
                Perlimpinpin est un projet éditorial indépendant. Nos analyses
                sont gratuites, sans publicité et sans influence politique.
              </p>
            </div>
          </div>

          <Link
            href="/a-propos"
            className="shrink-0 whitespace-nowrap text-sm font-semibold text-blue-600 transition-colors hover:text-blue-800"
          >
            En savoir plus sur nous →
          </Link>
        </div>
      </section>
    </div>
  );
}
