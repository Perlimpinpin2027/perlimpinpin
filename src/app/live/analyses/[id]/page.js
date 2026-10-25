import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getLiveUser } from "@/lib/live-auth";
import {
  getLiveAnalyseDetail,
  getLiveCandidatCounts,
  getLiveDossiers,
  getRecentLiveAnalyses,
} from "@/lib/live-history";
import { getLiveChatMessages } from "@/lib/live-chat-db";
import { SCOPE_COOKIE_NAME, normalizeScope } from "@/lib/live-scope";
import AnalysisActions from "../../AnalysisActions";
import AnalysisView from "../../AnalysisView";
import AnalysisChat from "../../AnalysisChat";
import { LiveSearchProvider, SearchBar } from "../../LiveSearch";
import LiveShell from "../../LiveShell";
import LiveSidebar from "../../LiveSidebar";
import VideoSource from "../../VideoSource";
import { Avatar, Icon } from "../../ui";

export const metadata = {
  title: "Analyse — PerlimpinpinGo",
  robots: { index: false, follow: false },
};

const SIDEBAR_COUNT = 6;
const QUOTE_LENGTH = 320;

// Extrait de la déclaration (le texte complet reste consultable).
function excerpt(text) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > QUOTE_LENGTH ? `${clean.slice(0, QUOTE_LENGTH - 1).trimEnd()}…` : clean;
}

// Adresse cliquable : http(s) uniquement (déjà validée à l'enregistrement)
function safeHref(url) {
  return typeof url === "string" && /^https?:\/\/\S+$/i.test(url) ? url : null;
}

export default async function AnalysePage({ params }) {
  // Le proxy filtre déjà /live/* ; on revérifie ici, au plus près du contenu.
  const user = await getLiveUser();
  if (!user) redirect("/live/login");

  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) notFound();

  // Toute analyse de l'équipe reste consultable par lien, quelle que soit la portée
  // choisie pour les listes (la barre latérale, elle, la suit).
  const scope = normalizeScope((await cookies()).get(SCOPE_COOKIE_NAME)?.value);
  const listOptions = { userId: user.id, scope };
  const [analyse, historique, messages, dossiers, candidatCounts] = await Promise.all([
    getLiveAnalyseDetail(id, { userId: user.id }),
    getRecentLiveAnalyses(SIDEBAR_COUNT, listOptions),
    getLiveChatMessages(id),
    getLiveDossiers(listOptions),
    getLiveCandidatCounts(listOptions),
  ]);
  if (!analyse) notFound();

  const candidatNom = analyse.candidat?.nom ?? null;
  const citation = excerpt(analyse.declaration);
  const origine = analyse.video
    ? `Vidéo ${analyse.video.label}`
    : (analyse.sourceLabel ?? "Déclaration collée par l'équipe");
  const lienSource = safeHref(analyse.sourceUrl);
  const declarationLongue = analyse.declaration.replace(/\s+/g, " ").trim().length > QUOTE_LENGTH;

  // Déclaration, vidéo et origine : en tête du panneau « Lire l'analyse détaillée »
  const declaration = (
    <div>
      <h3 className="text-base font-bold text-zinc-900">Déclaration analysée</h3>
      <p className="mt-1 text-xs text-zinc-500">
        {origine} · {analyse.themeLabel} · Par {analyse.auteurLabel}
        {lienSource && (
          <>
            {" · "}
            <a href={lienSource} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline">
              Voir la source
              <Icon name="external" className="h-3 w-3" />
            </a>
          </>
        )}
      </p>
      <blockquote className="mt-3 border-l-2 border-blue-300 pl-4 text-sm leading-relaxed text-zinc-600">
        <p>{`« ${citation} »`}</p>
        {declarationLongue && (
          <details className="mt-2">
            <summary className="cursor-pointer text-xs font-medium text-blue-600 hover:underline">
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
    </div>
  );

  const sidebar = (
    <LiveSidebar
      vue="analyses"
      user={user}
      scope={scope}
      candidats={candidatCounts}
      themes={dossiers}
      deplie={false}
      historique={historique}
      currentId={analyse.id}
    />
  );

  return (
    <LiveSearchProvider query="">
      <LiveShell sidebar={sidebar} vue="analyses" user={user}>
        <div className="mx-auto max-w-[1180px]">
          <SearchBar key="" />

          {/* Fil d'Ariane et actions (Partager, Exporter) */}
          <div className="flex items-center justify-between gap-4">
            <nav aria-label="Fil d'Ariane" className="flex min-w-0 items-center gap-2 text-[15px] text-zinc-500">
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

          {/* En-tête : photo du candidat, « candidat · date », titre */}
          <header className="mt-6 flex items-center gap-5 sm:gap-7">
            <Avatar nom={candidatNom} photoUrl={analyse.candidat?.photoUrl ?? null} size={96} rounded="rounded-2xl" />
            <div className="min-w-0">
              <p className="text-sm text-zinc-500">
                <span className="font-medium text-zinc-800">{candidatNom ?? "Candidat non précisé"}</span> ·{" "}
                {analyse.dateLabel}
              </p>
              <h1 className="mt-1.5 font-sans text-3xl font-extrabold leading-[1.05] tracking-[-0.035em] text-zinc-900 sm:text-4xl lg:text-5xl">
                {analyse.titre}
              </h1>
            </div>
          </header>

          <div className="mt-5">
            <AnalysisView key={analyse.id} analyse={analyse} declaration={declaration} />
          </div>

          {/* Questions sur l'analyse : fil enregistré + barre fixée en bas de la colonne */}
          <AnalysisChat key={analyse.id} analyseId={analyse.id} initialMessages={messages} mode={analyse.mode} />
        </div>
      </LiveShell>
    </LiveSearchProvider>
  );
}
