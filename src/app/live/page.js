import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getLiveUser } from "@/lib/live-auth";
import {
  SEARCH_MAX_LENGTH,
  SEARCH_MIN_LENGTH,
  getCandidatsForSelect,
  getLiveDossiers,
  getRecentLiveAnalyses,
  searchLiveAnalyses,
} from "@/lib/live-history";
import { SCOPE_COOKIE_NAME, normalizeScope } from "@/lib/live-scope";
import { LIVE_THEME_SLUGS, liveThemeLabel } from "@/lib/live-themes";
import Dossiers from "./Dossiers";
import LiveAnalyzer from "./LiveAnalyzer";
import LiveAside from "./LiveAside";
import { ClearSearchButton, LiveSearchProvider, SearchBar } from "./LiveSearch";
import LiveSidebar, { LiveBrand, LiveMobileNav, LiveMobileUser, LiveSearchIcon } from "./LiveSidebar";
import RecentAnalyses from "./RecentAnalyses";
import ScopeToggle from "./ScopeToggle";

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
  const user = await getLiveUser();
  if (!user) redirect("/live/login");

  // Vues portées par l'URL : /live (analyses), ?dossier=<slug> (analyses
  // filtrées sur un thème), ?vue=dossiers, ?vue=favoris, ?q=<texte>
  // (recherche dans les analyses enregistrées).
  const params = await searchParams;
  const rawQuery = typeof params.q === "string" ? params.q.trim().slice(0, SEARCH_MAX_LENGTH) : "";
  const q = rawQuery.length >= SEARCH_MIN_LENGTH ? rawQuery : "";
  const vue = q
    ? "recherche"
    : params.vue === "dossiers" || params.vue === "favoris"
      ? params.vue
      : "analyses";
  const dossier =
    vue === "analyses" && LIVE_THEME_SLUGS.includes(params.dossier) ? params.dossier : null;

  // Portée des listes : « Mes analyses » (défaut) ou « Toutes les analyses ». Les favoris
  // sont toujours ceux du journaliste connecté.
  const scope = normalizeScope((await cookies()).get(SCOPE_COOKIE_NAME)?.value);
  const listOptions = { userId: user.id, scope };

  const [historique, cartes, dossiers, candidats, recherche] = await Promise.all([
    getRecentLiveAnalyses(SIDEBAR_COUNT, { ...listOptions, theme: dossier }),
    vue === "favoris"
      ? getRecentLiveAnalyses(FAVORIS_COUNT, { ...listOptions, favoris: true })
      : vue === "analyses"
        ? getRecentLiveAnalyses(dossier ? CARDS_COUNT_FILTERED : CARDS_COUNT, { ...listOptions, theme: dossier })
        : Promise.resolve([]),
    getLiveDossiers(listOptions),
    vue === "analyses" || vue === "recherche" ? getCandidatsForSelect() : Promise.resolve([]),
    q ? searchLiveAnalyses(q, listOptions) : Promise.resolve(null),
  ]);

  const enRecherche = vue === "recherche";

  return (
    <LiveSearchProvider query={q}>
      <div className="min-h-screen bg-background font-sans lg:grid lg:grid-cols-[288px_minmax(0,1fr)_320px]">
        <LiveSidebar
          historique={historique}
          vue={vue}
          user={user}
          scope={scope}
          dossierLabel={dossier ? liveThemeLabel(dossier) : null}
        />

        {/* Barre du haut, mobile uniquement (la barre latérale est masquée sous lg) */}
        <div className="border-b border-zinc-200 bg-white px-5 py-4 lg:hidden">
          <div className="flex items-center justify-between gap-2">
            <LiveBrand />
            <LiveSearchIcon />
          </div>
          <LiveMobileNav vue={vue} />
          <LiveMobileUser user={user} />
        </div>

        <main className="min-w-0 px-5 py-8 sm:px-8 lg:py-10">
          <div className="mx-auto max-w-3xl">
            {/* Champ de recherche : visible une fois ouvert (icône ou carte « Rechercher un sujet ») */}
            <SearchBar key={q} />

            {(vue === "analyses" || enRecherche) && (
              // Reste monté (masqué) pendant une recherche : un texte en cours de
              // saisie ou un résultat d'analyse n'est pas perdu.
              <div hidden={enRecherche}>
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
              </div>
            )}

            {vue === "analyses" && (
              <>
                <div className="mt-10 flex justify-end">
                  <ScopeToggle scope={scope} />
                </div>
                <section aria-labelledby="live-dossiers" className="mt-4">
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
                  showAuthor={scope === "toutes"}
                  vide={
                    dossier
                      ? "Aucune analyse dans ce dossier."
                      : scope === "toutes"
                        ? "Aucune analyse pour le moment. Lancez-en une ci-dessus : elle apparaîtra ici."
                        : "Vous n'avez pas encore lancé d'analyse. Lancez-en une ci-dessus : elle apparaîtra ici."
                  }
                />
              </>
            )}

            {enRecherche && (
              <>
                <h1 className="sr-only">Résultats de recherche</h1>
                <div className="flex justify-end">
                  <ScopeToggle scope={scope} />
                </div>
                <div className="-mt-6">
                  <RecentAnalyses
                    analyses={recherche.analyses}
                    titre={
                      `${recherche.total} ${recherche.total > 1 ? "résultats" : "résultat"} pour « ${recherche.query} »` +
                      (recherche.total > recherche.analyses.length
                        ? ` (les ${recherche.analyses.length} plus récents affichés)`
                        : "")
                    }
                    action={
                      <ClearSearchButton className="text-sm text-indigo-600 hover:underline">
                        Effacer la recherche
                      </ClearSearchButton>
                    }
                    showAuthor={scope === "toutes"}
                    vide={
                      scope === "toutes"
                        ? "Aucune analyse ne correspond à cette recherche."
                        : "Aucune de vos analyses ne correspond à cette recherche. Essayez « Toutes les analyses »."
                    }
                  />
                </div>
              </>
            )}

            {vue === "dossiers" && (
              <>
                <h1 className="font-serif text-3xl font-bold leading-tight text-zinc-900">Dossiers</h1>
                <p className="mt-2 text-sm text-zinc-500">
                  {scope === "toutes" ? "Les analyses de l'équipe" : "Vos analyses"}, regroupées automatiquement par thème.
                  Cliquez sur un dossier pour ne voir que ses analyses.
                </p>
                <div className="mt-4">
                  <ScopeToggle scope={scope} />
                </div>
                {dossiers.length === 0 ? (
                  <p className="mt-6 rounded-xl border border-dashed border-zinc-300 px-4 py-6 text-center text-sm text-zinc-500">
                    {scope === "toutes"
                      ? "Aucun dossier pour le moment. Les dossiers se forment"
                      : "Vous n'avez pas encore de dossier : ils se forment"}{" "}
                    automatiquement à mesure que vous analysez des déclarations.
                  </p>
                ) : (
                  <Dossiers dossiers={dossiers} />
                )}
              </>
            )}

            {vue === "favoris" && (
              <>
                <h1 className="font-serif text-3xl font-bold leading-tight text-zinc-900">Favoris</h1>
                <p className="mt-2 text-sm text-zinc-500">Les analyses que vous avez marquées d&apos;une étoile : vos favoris sont personnels, les autres journalistes ne les voient pas.</p>
                <div className="-mt-6">
                  <RecentAnalyses
                    analyses={cartes}
                    showAuthor
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
    </LiveSearchProvider>
  );
}
