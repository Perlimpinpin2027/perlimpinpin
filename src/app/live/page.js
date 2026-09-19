import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LIVE_COOKIE_NAME, verifySessionToken } from "@/lib/live-session";
import { getCandidatsForSelect, getLiveDossiers, getRecentLiveAnalyses } from "@/lib/live-history";
import { LIVE_THEME_SLUGS, liveThemeLabel } from "@/lib/live-themes";
import Dossiers from "./Dossiers";
import LiveAnalyzer from "./LiveAnalyzer";
import LiveAside from "./LiveAside";
import LiveSidebar, { LiveBrand, LiveMobileNav } from "./LiveSidebar";
import RecentAnalyses from "./RecentAnalyses";

export const metadata = {
  title: "PerlimpinpinGo — Perlimpinpin",
  robots: { index: false, follow: false },
};

const SIDEBAR_COUNT = 8;
const CARDS_COUNT = 6;
const CARDS_COUNT_FILTERED = 24;
const FAVORIS_COUNT = 100;
const DOSSIERS_PREVIEW = 6;

export default async function LivePage({ searchParams }) {
  // Le proxy filtre déjà /live ; on revérifie ici, au plus près du contenu.
  const token = (await cookies()).get(LIVE_COOKIE_NAME)?.value;
  if (!verifySessionToken(token)) redirect("/live/login");

  // Vues portées par l'URL : /live (analyses), ?dossier=<slug> (analyses
  // filtrées sur un thème), ?vue=dossiers, ?vue=favoris.
  const params = await searchParams;
  const vue = params.vue === "dossiers" || params.vue === "favoris" ? params.vue : "analyses";
  const dossier =
    vue === "analyses" && LIVE_THEME_SLUGS.includes(params.dossier) ? params.dossier : null;

  const [historique, cartes, dossiers, candidats] = await Promise.all([
    getRecentLiveAnalyses(SIDEBAR_COUNT, { theme: dossier }),
    vue === "favoris"
      ? getRecentLiveAnalyses(FAVORIS_COUNT, { favoris: true })
      : vue === "analyses"
        ? getRecentLiveAnalyses(dossier ? CARDS_COUNT_FILTERED : CARDS_COUNT, { theme: dossier })
        : Promise.resolve([]),
    getLiveDossiers(),
    vue === "analyses" ? getCandidatsForSelect() : Promise.resolve([]),
  ]);

  return (
    <div className="min-h-screen bg-background font-sans lg:grid lg:grid-cols-[260px_minmax(0,1fr)_320px]">
      <LiveSidebar historique={historique} vue={vue} dossierLabel={dossier ? liveThemeLabel(dossier) : null} />

      {/* Barre du haut, mobile uniquement (la barre latérale est masquée sous lg) */}
      <div className="border-b border-zinc-200 bg-white px-5 py-4 lg:hidden">
        <LiveBrand />
        <LiveMobileNav vue={vue} />
      </div>

      <main className="min-w-0 px-5 py-8 sm:px-8 lg:py-10">
        <div className="mx-auto max-w-3xl">
          {vue === "analyses" && (
            <>
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

              <section aria-labelledby="live-dossiers" className="mt-10">
                <div className="flex items-baseline justify-between gap-4">
                  <h2 id="live-dossiers" className="text-lg font-bold text-zinc-900">
                    Dossiers
                  </h2>
                  {dossiers.length > DOSSIERS_PREVIEW && (
                    <Link href="/live?vue=dossiers" className="text-sm text-indigo-600 hover:underline">
                      Voir tous les dossiers ({dossiers.length})
                    </Link>
                  )}
                </div>
                {dossiers.length === 0 ? (
                  <p className="mt-3 rounded-xl border border-dashed border-zinc-300 px-4 py-6 text-center text-sm text-zinc-500">
                    Les dossiers se forment automatiquement, par thème, à mesure que vous analysez des déclarations.
                  </p>
                ) : (
                  <Dossiers dossiers={dossiers} actif={dossier} limit={DOSSIERS_PREVIEW} />
                )}
              </section>

              <RecentAnalyses
                analyses={cartes}
                titre={dossier ? `Dossier : ${liveThemeLabel(dossier)}` : "Analyses récentes"}
                action={
                  dossier ? (
                    <Link href="/live" className="text-sm text-indigo-600 hover:underline">
                      Retirer le filtre
                    </Link>
                  ) : null
                }
                vide={
                  dossier
                    ? "Aucune analyse dans ce dossier."
                    : "Aucune analyse pour le moment. Lancez-en une ci-dessus : elle apparaîtra ici."
                }
              />
            </>
          )}

          {vue === "dossiers" && (
            <>
              <h1 className="font-serif text-3xl font-bold leading-tight text-zinc-900">Dossiers</h1>
              <p className="mt-2 text-sm text-zinc-500">
                Vos analyses, regroupées automatiquement par thème. Cliquez sur un dossier pour ne voir que
                ses analyses.
              </p>
              {dossiers.length === 0 ? (
                <p className="mt-6 rounded-xl border border-dashed border-zinc-300 px-4 py-6 text-center text-sm text-zinc-500">
                  Aucun dossier pour le moment. Ils se forment automatiquement à mesure que vous analysez des
                  déclarations.
                </p>
              ) : (
                <Dossiers dossiers={dossiers} />
              )}
            </>
          )}

          {vue === "favoris" && (
            <>
              <h1 className="font-serif text-3xl font-bold leading-tight text-zinc-900">Favoris</h1>
              <p className="mt-2 text-sm text-zinc-500">Les analyses que vous avez marquées d&apos;une étoile.</p>
              <div className="-mt-6">
                <RecentAnalyses
                  analyses={cartes}
                  titre={`${cartes.length} ${cartes.length > 1 ? "analyses favorites" : "analyse favorite"}`}
                  vide="Aucun favori pour le moment. Cliquez sur l'étoile d'une analyse pour la retrouver ici."
                />
              </div>
            </>
          )}
        </div>
      </main>

      <LiveAside />
    </div>
  );
}
