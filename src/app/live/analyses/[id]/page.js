import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { LIVE_COOKIE_NAME, verifySessionToken } from "@/lib/live-session";
import { getLiveAnalyseDetail, getRecentLiveAnalyses } from "@/lib/live-history";
import AnalysisActions from "../../AnalysisActions";
import AnalysisAside from "../../AnalysisAside";
import AnalysisView from "../../AnalysisView";
import AskBar from "../../AskBar";
import { LiveSearchProvider, SearchBar } from "../../LiveSearch";
import LiveSidebar, { LiveBrand, LiveMobileNav, LiveSearchIcon } from "../../LiveSidebar";
import VideoSource from "../../VideoSource";
import { Avatar, Icon } from "../../ui";

export const metadata = {
  title: "Analyse — PerlimpinpinGo",
  robots: { index: false, follow: false },
};

const SIDEBAR_COUNT = 8;
const QUOTE_LENGTH = 320;

// Extrait de la déclaration pour l'en-tête (le texte complet reste consultable).
function excerpt(text) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > QUOTE_LENGTH ? `${clean.slice(0, QUOTE_LENGTH - 1).trimEnd()}…` : clean;
}

export default async function AnalysePage({ params }) {
  // Le proxy filtre déjà /live/* ; on revérifie ici, au plus près du contenu.
  const token = (await cookies()).get(LIVE_COOKIE_NAME)?.value;
  if (!verifySessionToken(token)) redirect("/live/login");

  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const [analyse, historique] = await Promise.all([getLiveAnalyseDetail(id), getRecentLiveAnalyses(SIDEBAR_COUNT)]);
  if (!analyse) notFound();

  const candidatNom = analyse.candidat?.nom ?? null;
  const citation = excerpt(analyse.declaration);
  const sourceLibelle = analyse.video
    ? `Vidéo ${analyse.video.label}`
    : (analyse.sourceLabel ?? "Déclaration collée par l'équipe");
  const declarationLongue = analyse.declaration.replace(/\s+/g, " ").trim().length > QUOTE_LENGTH;

  return (
    <LiveSearchProvider query="">
      <div className="min-h-screen bg-background font-sans lg:grid lg:grid-cols-[288px_minmax(0,1fr)_320px]">
        <LiveSidebar historique={historique} vue="analyses" currentId={analyse.id} />

        {/* Barre du haut, mobile uniquement (la barre latérale est masquée sous lg) */}
        <div className="border-b border-zinc-200 bg-white px-5 py-4 lg:hidden">
          <div className="flex items-center justify-between gap-2">
            <LiveBrand />
            <LiveSearchIcon />
          </div>
          <LiveMobileNav vue="analyses" />
        </div>

        <main className="min-w-0 px-5 py-8 sm:px-8 lg:py-10">
          <div className="mx-auto max-w-3xl">
            <SearchBar key="" />

            {/* Fil d'Ariane et actions (Partager, Exporter) */}
            <div className="flex items-center justify-between gap-4">
              <nav aria-label="Fil d'Ariane" className="flex min-w-0 items-center gap-1.5 text-sm text-zinc-500">
                <Link href="/live" className="shrink-0 hover:text-zinc-900 hover:underline">
                  Analyses
                </Link>
                <Icon name="chevronRight" className="h-3.5 w-3.5 shrink-0" />
                <span aria-current="page" className="truncate text-zinc-800">
                  {analyse.titre}
                </span>
              </nav>
              <AnalysisActions analyseId={analyse.id} />
            </div>

            {/* En-tête : candidat, date, source, titre généré et citation. Le bloc vidéo
                n'existe que si la source est une vidéo reconnue (YouTube, Dailymotion, X, France TV). */}
            <header className="mt-6 flex items-start gap-4 sm:gap-5">
              <Avatar nom={candidatNom} photoUrl={analyse.candidat?.photoUrl ?? null} size={88} rounded="rounded-xl" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-800">{candidatNom ?? "Candidat non précisé"}</p>
                <p className="mt-0.5 text-xs text-zinc-400">
                  {analyse.dateLabel} · {sourceLibelle} · {analyse.themeLabel}
                </p>
                <h1 className="mt-2 font-serif text-3xl font-bold leading-tight text-zinc-900 sm:text-4xl">
                  {analyse.titre}
                </h1>
              </div>
            </header>

            <blockquote className="mt-5 border-l-2 border-indigo-300 pl-4 text-sm leading-relaxed text-zinc-500">
              <p>{`« ${citation} »`}</p>
              {declarationLongue && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs font-medium text-indigo-600 hover:underline">
                    Voir la déclaration complète
                  </summary>
                  <p className="mt-2 whitespace-pre-line text-zinc-600">{analyse.declaration}</p>
                </details>
              )}
            </blockquote>

            {analyse.video && (
              <div className="mt-4">
                <VideoSource video={analyse.video} sourceUrl={analyse.sourceUrl} titre={analyse.titre} />
              </div>
            )}

            <div className="mt-8">
              <AnalysisView key={analyse.id} analyse={analyse} />
            </div>

            <AskBar />
          </div>
        </main>

        <AnalysisAside analyse={analyse} />
      </div>
    </LiveSearchProvider>
  );
}
