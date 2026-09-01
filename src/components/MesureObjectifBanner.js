import ArrowIcon from "./ArrowIcon";

// Bannière mesure → objectif visé, réutilisable : d'abord sur la fiche
// déclaration (entre le résumé IA et le détail du score), plus tard sur la
// future page de regroupement par catégorie. Purement présentationnelle
// (pas d'état, pas d'interaction) : reste un composant serveur.
//
// categorieObjectif est nullable (mesure_vers_objectif.categorie_objectif,
// voir data/prompt-methodologie.md — "null" quand aucune des 12 catégories
// fermées ne convient) : l'étiquette est alors omise entièrement plutôt que
// d'afficher un badge vide.
export default function MesureObjectifBanner({ categorieObjectif, titre, objectifCourt }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8">
      {categorieObjectif ? (
        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-zinc-400">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" aria-hidden="true" />
          {categorieObjectif}
        </span>
      ) : null}

      <div
        className={`flex flex-col items-stretch gap-4 md:flex-row md:items-center md:gap-6 ${
          categorieObjectif ? "mt-4" : ""
        }`}
      >
        <div className="min-w-0 flex-1">
          <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">
            Mesure
          </span>
          <p className="mt-1 text-base font-bold leading-snug text-zinc-900">{titre}</p>
        </div>

        {/* Horizontale sur desktop, verticale sur mobile — jamais de
            flèche horizontale compressée sous 768px (voir la demande
            d'origine), donc deux icônes distinctes plutôt qu'une seule
            pivotée en CSS. */}
        <div className="flex shrink-0 items-center justify-center py-1 md:py-0" aria-hidden="true">
          <ArrowIcon direction="right" className="hidden h-5 w-5 text-orange-500 md:block" />
          <ArrowIcon direction="down" className="h-5 w-5 text-orange-500 md:hidden" />
        </div>

        <div className="min-w-0 flex-1">
          <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">
            Objectif visé
          </span>
          <p className="mt-1 text-base font-bold leading-snug text-zinc-900">{objectifCourt}</p>
        </div>
      </div>
    </div>
  );
}
