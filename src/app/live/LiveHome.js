import Link from "next/link";
import Dossiers from "./Dossiers";
import LiveAnalyzer from "./LiveAnalyzer";
import { ClearSearchButton, SearchBar, SearchTrigger } from "./LiveSearch";
import LiveShell from "./LiveShell";
import LiveSidebar, { UserBadge } from "./LiveSidebar";
import RecentAnalyses from "./RecentAnalyses";
import ScopeToggle from "./ScopeToggle";
import { ComingSoon, GO_BUTTON, Icon, SOON_BADGE } from "./ui";

// Affichage de l'accueil de PerlimpinpinGo (/live), d'après la maquette. Ne lit
// rien en base : toutes les données sont chargées par page.js et passées ici.
//
// Vues (portées par l'URL, voir page.js) :
//   - "analyses" : accueil (titre, zone de saisie, 4 analyses récentes, dossiers),
//     ou liste filtrée si `filtre` est fourni (?dossier=, ?candidat=, ?tout=1) ;
//   - "recherche" : résultats de ?q= ;
//   - "dossiers", "favoris".

const DOSSIERS_PREVIEW = 4;

const TITLE_CLASS = "font-sans text-4xl font-extrabold leading-tight tracking-[-0.035em] text-zinc-900";

// Boutons du haut de l'accueil (desktop) : recherche, fonctions à venir, profil.
function TopBar({ user }) {
  return (
    <>
      <SearchTrigger className={`${GO_BUTTON} h-12 px-5`}>
        <Icon name="search" className="h-5 w-5 text-zinc-700" />
        Rechercher un sujet
      </SearchTrigger>
      <ComingSoon>
        <button type="button" disabled className={`${GO_BUTTON} h-12 px-5 !opacity-100`}>
          <Icon name="microphone" className="h-5 w-5 text-zinc-700" />
          Préparer une interview
          <span className={SOON_BADGE}>Bientôt</span>
        </button>
      </ComingSoon>
      <ComingSoon>
        <button type="button" disabled className={`${GO_BUTTON} h-12 px-5 !opacity-100`}>
          <Icon name="compare" className="h-5 w-5 text-zinc-700" />
          Comparer des déclarations
          <span className={SOON_BADGE}>Bientôt</span>
        </button>
      </ComingSoon>
      <span className="ml-1">
        <UserBadge user={user} />
      </span>
    </>
  );
}

function RemoveFilter() {
  return (
    <Link href="/live" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900">
      Retirer le filtre
      <Icon name="arrowRight" className="h-4 w-4" />
    </Link>
  );
}

export default function LiveHome({
  user,
  scope,
  vue,
  filtre = null, // { titre } pour une liste filtrée (dossier, candidat, toutes)
  dossierActif = null,
  candidatActif = null,
  cartes = [],
  dossiers = [],
  candidatCounts = [],
  candidatsSelect = [],
  recherche = null,
}) {
  const enRecherche = vue === "recherche";
  const accueil = vue === "analyses" && !filtre;
  const toutes = scope === "toutes";

  const sidebar = (
    <LiveSidebar
      vue={vue}
      user={user}
      scope={scope}
      candidats={candidatCounts}
      themes={dossiers}
      candidatActif={candidatActif}
      dossierActif={dossierActif}
      deplie
    />
  );

  return (
    <LiveShell sidebar={sidebar} topBar={<TopBar user={user} />} vue={vue} user={user}>
      <div className="mx-auto max-w-[1250px]">
        {/* Champ de recherche : visible une fois ouvert (loupe ou « Rechercher un sujet ») */}
        <SearchBar key={recherche?.query ?? ""} />

        {(accueil || enRecherche) && (
          // Reste monté (masqué) pendant une recherche : un texte en cours de
          // saisie ou un résultat d'analyse n'est pas perdu.
          <div hidden={enRecherche}>
            <h1 className="font-sans text-5xl font-extrabold leading-[0.98] tracking-[-0.045em] text-zinc-900 sm:text-6xl lg:text-[76px]">
              Analysez, vérifiez,
              <br />
              <span className="text-blue-500">questionnez.</span>
            </h1>
            <p className="mt-3 text-xl text-zinc-500 sm:text-2xl">Les faits, rien que les faits.</p>

            <div className="mt-8">
              <LiveAnalyzer candidats={candidatsSelect} />
            </div>
          </div>
        )}

        {accueil && (
          <>
            <RecentAnalyses
              analyses={cartes}
              titre="Analyses récentes"
              outils={<ScopeToggle scope={scope} />}
              action={
                cartes.length > 0 ? (
                  <Link href="/live?tout=1" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900">
                    {toutes ? "Voir toutes les analyses" : "Voir toutes mes analyses"}
                    <Icon name="arrowRight" className="h-4 w-4" />
                  </Link>
                ) : null
              }
              showAuthor={toutes}
              vide={
                toutes
                  ? "Aucune analyse pour le moment. Lancez-en une ci-dessus : elle apparaîtra ici."
                  : "Vous n'avez pas encore lancé d'analyse. Lancez-en une ci-dessus : elle apparaîtra ici."
              }
            />

            <section aria-labelledby="live-dossiers" className="mt-10">
              <div className="flex items-center justify-between gap-4">
                <h2 id="live-dossiers" className="text-2xl font-bold tracking-tight text-zinc-900">
                  Dossiers
                </h2>
                {dossiers.length > 0 && (
                  <Link href="/live?vue=dossiers" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900">
                    Voir tous les dossiers
                    <Icon name="arrowRight" className="h-4 w-4" />
                  </Link>
                )}
              </div>
              {dossiers.length === 0 ? (
                <p className="mt-4 rounded-2xl border border-dashed border-zinc-300 px-4 py-6 text-center text-sm text-zinc-500">
                  Les dossiers se forment automatiquement, par thème, à mesure que vous analysez des déclarations.
                </p>
              ) : (
                <Dossiers dossiers={dossiers} limit={DOSSIERS_PREVIEW} />
              )}
            </section>
          </>
        )}

        {vue === "analyses" && filtre && (
          <>
            <h1 className={TITLE_CLASS}>{filtre.titre}</h1>
            {filtre.sousTitre && <p className="mt-2 text-sm text-zinc-500">{filtre.sousTitre}</p>}
            <div className="-mt-4">
              <RecentAnalyses
                analyses={cartes}
                titre={`${cartes.length} ${cartes.length > 1 ? "analyses" : "analyse"}${cartes.length >= filtre.max ? " (les plus récentes)" : ""}`}
                titreClass="text-base text-zinc-500 !font-medium"
                outils={<ScopeToggle scope={scope} />}
                action={<RemoveFilter />}
                showAuthor={toutes}
                vide={filtre.vide}
              />
            </div>
          </>
        )}

        {enRecherche && (
          <>
            <h1 className="sr-only">Résultats de recherche</h1>
            <div className="-mt-6">
              <RecentAnalyses
                analyses={recherche.analyses}
                titre={
                  `${recherche.total} ${recherche.total > 1 ? "résultats" : "résultat"} pour « ${recherche.query} »` +
                  (recherche.total > recherche.analyses.length
                    ? ` (les ${recherche.analyses.length} plus récents affichés)`
                    : "")
                }
                outils={<ScopeToggle scope={scope} />}
                action={
                  <ClearSearchButton className="text-sm text-zinc-500 hover:text-zinc-900">
                    Effacer la recherche
                  </ClearSearchButton>
                }
                showAuthor={toutes}
                vide={
                  toutes
                    ? "Aucune analyse ne correspond à cette recherche."
                    : "Aucune de vos analyses ne correspond à cette recherche. Essayez « Toutes les analyses »."
                }
              />
            </div>
          </>
        )}

        {vue === "dossiers" && (
          <>
            <h1 className={TITLE_CLASS}>Dossiers</h1>
            <p className="mt-2 text-sm text-zinc-500">
              {toutes ? "Les analyses de l'équipe" : "Vos analyses"}, regroupées automatiquement par thème. Cliquez sur
              un dossier pour ne voir que ses analyses.
            </p>
            <div className="mt-4">
              <ScopeToggle scope={scope} />
            </div>
            {dossiers.length === 0 ? (
              <p className="mt-6 rounded-2xl border border-dashed border-zinc-300 px-4 py-6 text-center text-sm text-zinc-500">
                {toutes
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
            <h1 className={TITLE_CLASS}>Favoris</h1>
            <p className="mt-2 text-sm text-zinc-500">
              Les analyses que vous avez marquées d&apos;une étoile : vos favoris sont personnels, les autres
              journalistes ne les voient pas.
            </p>
            <div className="-mt-4">
              <RecentAnalyses
                analyses={cartes}
                showAuthor
                titre={`${cartes.length} ${cartes.length > 1 ? "analyses favorites" : "analyse favorite"}`}
                titreClass="text-base text-zinc-500 !font-medium"
                vide="Aucun favori pour le moment. Cliquez sur l'étoile d'une analyse pour la retrouver ici."
              />
            </div>
          </>
        )}
      </div>
    </LiveShell>
  );
}
