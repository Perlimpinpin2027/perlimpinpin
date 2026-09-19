import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LIVE_COOKIE_NAME, verifySessionToken } from "@/lib/live-session";
import { getCandidatsForSelect, getRecentLiveAnalyses } from "@/lib/live-history";
import LiveAnalyzer from "./LiveAnalyzer";
import LiveAside from "./LiveAside";
import LiveSidebar, { LiveBrand } from "./LiveSidebar";
import RecentAnalyses from "./RecentAnalyses";

export const metadata = {
  title: "PerlimpinpinGo — Perlimpinpin",
  robots: { index: false, follow: false },
};

const SIDEBAR_COUNT = 8;
const CARDS_COUNT = 6;

export default async function LivePage() {
  // Le proxy filtre déjà /live ; on revérifie ici, au plus près du contenu.
  const token = (await cookies()).get(LIVE_COOKIE_NAME)?.value;
  if (!verifySessionToken(token)) redirect("/live/login");

  const [analyses, candidats] = await Promise.all([
    getRecentLiveAnalyses(SIDEBAR_COUNT),
    getCandidatsForSelect(),
  ]);

  return (
    <div className="min-h-screen bg-background font-sans lg:grid lg:grid-cols-[260px_minmax(0,1fr)_320px]">
      <LiveSidebar historique={analyses} />

      {/* Barre du haut, mobile uniquement (la barre latérale est masquée sous lg) */}
      <div className="border-b border-zinc-200 bg-white px-5 py-4 lg:hidden">
        <LiveBrand />
      </div>

      <main className="min-w-0 px-5 py-8 sm:px-8 lg:py-10">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-serif text-3xl font-bold leading-tight text-zinc-900">
            Que souhaitez-vous analyser ?
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Collez la déclaration d&apos;un candidat pour obtenir une estimation préliminaire de la
            faisabilité de ses mesures.
          </p>

          <div className="mt-8">
            <LiveAnalyzer candidats={candidats} />
          </div>

          <RecentAnalyses analyses={analyses.slice(0, CARDS_COUNT)} />
        </div>
      </main>

      <LiveAside />
    </div>
  );
}
