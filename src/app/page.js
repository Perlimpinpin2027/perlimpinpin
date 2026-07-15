import Header from "@/components/Header";
import HeroText from "@/components/HeroText";
import FeaturedQuoteCard from "@/components/FeaturedQuoteCard";
import ScoreCard from "@/components/ScoreCard";
import ThemeTags from "@/components/ThemeTags";
import BottomColumns from "@/components/BottomColumns";
import {
  getFeaturedAnalysis,
  getTopDeclarations,
  getCandidateRanking,
} from "@/lib/queries";

// La page dépend de données Neon qui changent (analyses publiées, scores) —
// rendu dynamique à chaque requête plutôt que figé au build.
export const dynamic = "force-dynamic";

export default async function Home() {
  const [featuredAnalysis, topDeclarations, rankedCandidates] =
    await Promise.all([
      getFeaturedAnalysis(),
      getTopDeclarations(3),
      getCandidateRanking(7),
    ]);

  return (
    <div className="flex min-h-screen flex-col bg-white font-sans">
      <Header />

      <section className="w-full px-6 py-10 sm:px-8 sm:py-14">
        <div className="mx-auto grid w-full max-w-[1280px] grid-cols-1 gap-8 lg:grid-cols-[5fr_3fr_2fr] lg:gap-6">
          <HeroText />
          <FeaturedQuoteCard {...(featuredAnalysis ?? {})} />
          <ScoreCard {...(featuredAnalysis ?? {})} />
        </div>
      </section>

      <section className="w-full px-6 pb-10 sm:px-8">
        <div className="mx-auto w-full max-w-[1280px]">
          <ThemeTags />
        </div>
      </section>

      <section className="w-full px-6 pb-16 sm:px-8 sm:pb-20">
        <div className="mx-auto w-full max-w-[1280px]">
          <BottomColumns
            topDeclarations={topDeclarations}
            rankedCandidates={rankedCandidates}
          />
        </div>
      </section>
    </div>
  );
}
