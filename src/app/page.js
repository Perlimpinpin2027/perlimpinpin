import Image from "next/image";
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

      <Image
        src="/banner-perlimpinpin.webp"
        alt="Perlimpinpin"
        width={2172}
        height={230}
        priority
        className="h-auto w-full"
      />

      <section className="w-full px-6 py-10 sm:px-8 sm:py-14">
        <div className="mx-auto grid w-full max-w-[1280px] grid-cols-1 gap-8 lg:grid-cols-[5fr_3fr_2fr] lg:gap-6">
          <HeroText />
          <FeaturedCarousel items={featuredRotation} />
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
