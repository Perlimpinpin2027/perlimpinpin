import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getLiveUser } from "@/lib/live-auth";
import {
  SEARCH_MAX_LENGTH,
  SEARCH_MIN_LENGTH,
  getCandidatsForSelect,
  getLiveCandidatCounts,
  getLiveDossiers,
  getRecentLiveAnalyses,
  searchLiveAnalyses,
} from "@/lib/live-history";
import { SCOPE_COOKIE_NAME, normalizeScope } from "@/lib/live-scope";
import { LIVE_THEME_SLUGS, liveThemeLabel } from "@/lib/live-themes";
import LiveHome from "./LiveHome";
import { LiveSearchProvider } from "./LiveSearch";

export const metadata = {
  title: "PerlimpinpinGo — Perlimpinpin",
  robots: { index: false, follow: false },
};

const CARDS_COUNT = 4;
const CARDS_COUNT_FILTERED = 24;
const FAVORIS_COUNT = 100;

export default async function LivePage({ searchParams }) {
  // Le proxy filtre déjà /live ; on revérifie ici, au plus près du contenu.
  const user = await getLiveUser();
  if (!user) redirect("/live/login");

  // Vues portées par l'URL : /live (accueil), ?dossier=<slug> (analyses d'un thème),
  // ?candidat=<id> (analyses d'un candidat), ?tout=1 (toutes les analyses de la
  // portée), ?vue=dossiers, ?vue=favoris, ?q=<texte> (recherche).
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
  const candidatParam = Number(params.candidat);
  const candidatId =
    vue === "analyses" && !dossier && Number.isInteger(candidatParam) && candidatParam > 0 ? candidatParam : null;
  const tout = vue === "analyses" && !dossier && !candidatId && params.tout === "1";
  const filtree = Boolean(dossier || candidatId || tout);

  // Portée des listes : « Mes analyses » (défaut) ou « Toutes les analyses ». Les favoris
  // sont toujours ceux du journaliste connecté.
  const scope = normalizeScope((await cookies()).get(SCOPE_COOKIE_NAME)?.value);
  const listOptions = { userId: user.id, scope };

  const [cartes, dossiers, candidatCounts, candidatsSelect, recherche] = await Promise.all([
    vue === "favoris"
      ? getRecentLiveAnalyses(FAVORIS_COUNT, { ...listOptions, favoris: true })
      : vue === "analyses"
        ? getRecentLiveAnalyses(filtree ? CARDS_COUNT_FILTERED : CARDS_COUNT, {
            ...listOptions,
            theme: dossier,
            candidatId,
          })
        : Promise.resolve([]),
    getLiveDossiers(listOptions),
    getLiveCandidatCounts(listOptions),
    // Liste du sélecteur de candidat de la zone de saisie (accueil et recherche)
    (vue === "analyses" && !filtree) || vue === "recherche" ? getCandidatsForSelect() : Promise.resolve([]),
    q ? searchLiveAnalyses(q, listOptions) : Promise.resolve(null),
  ]);

  const toutes = scope === "toutes";
  let filtre = null;
  if (dossier) {
    filtre = {
      titre: `Dossier : ${liveThemeLabel(dossier)}`,
      vide: "Aucune analyse dans ce dossier.",
    };
  } else if (candidatId) {
    // Nom du candidat : liste « Par candidat », sinon celle des cartes
    const nom =
      candidatCounts.find((candidat) => candidat.id === candidatId)?.nom ?? cartes[0]?.candidatNom ?? "candidat";
    filtre = {
      titre: `Analyses : ${nom}`,
      vide: toutes ? "Aucune analyse pour ce candidat." : "Vous n'avez pas encore analysé de déclaration de ce candidat.",
    };
  } else if (tout) {
    filtre = {
      titre: toutes ? "Toutes les analyses" : "Toutes mes analyses",
      vide: toutes ? "Aucune analyse pour le moment." : "Vous n'avez pas encore lancé d'analyse.",
    };
  }
  if (filtre) filtre.max = CARDS_COUNT_FILTERED;

  return (
    <LiveSearchProvider query={q}>
      <LiveHome
        user={user}
        scope={scope}
        vue={vue}
        filtre={filtre}
        dossierActif={dossier}
        candidatActif={candidatId}
        cartes={cartes}
        dossiers={dossiers}
        candidatCounts={candidatCounts}
        candidatsSelect={candidatsSelect}
        recherche={recherche}
      />
    </LiveSearchProvider>
  );
}
