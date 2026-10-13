import ArrowIcon from "./ArrowIcon";
import Editable from "@/app/test/Editable";

// Bannière mesure → objectif visé, réutilisable : d'abord sur la fiche
// déclaration (entre le résumé IA et le détail du score), plus tard sur la
// future page de regroupement par catégorie. Purement présentationnelle
// (pas d'état, pas d'interaction) : reste un composant serveur.
//
// categorieObjectif est nullable (mesure_vers_objectif.categorie_objectif,
// voir data/prompt-methodologie.md — "null" quand aucune des 12 catégories
// fermées ne convient) : l'étiquette est alors omise entièrement plutôt que
// d'afficher un badge vide.
const ETIQUETTE = "block text-[11px] font-semibold uppercase tracking-widest text-zinc-400";

// Mise en page à plat (pas de carte) : deux colonnes séparées par un trait
// vertical à partir de md, empilées et séparées par un trait horizontal en
// dessous.
//
// Crayons de /test/[id] (sans eux, sur le site public, le rendu est exactement
// le même) :
//   edition       : { analyseId, versionAttendue } — catégorie et objectif visé
//                   (contenuComplet.mesure_vers_objectif)
//   editionMesure : idem, ou null si la mesure a déjà une version publiée —
//                   mesure initiale (colonne Proposition.texteOriginal)
export default function MesureObjectifBanner({
  categorieObjectif,
  titre,
  objectifCourt,
  edition = null,
  editionMesure = null,
}) {
  const categorie = categorieObjectif ? (
    <span className="mb-4 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" aria-hidden="true" />
      {categorieObjectif}
    </span>
  ) : null;

  const mesure = (
    <>
      <span className={ETIQUETTE}>Mesure initiale</span>
      <p className="mt-1.5 text-sm font-bold leading-snug text-zinc-900">{titre}</p>
    </>
  );

  const objectif = (
    <>
      <span className={ETIQUETTE}>Objectif visé</span>
      <p className="mt-1.5 text-sm font-bold leading-snug text-zinc-900">{objectifCourt}</p>
    </>
  );
  const editionObjectif = typeof objectifCourt === "string" ? edition : null;

  return (
    <div>
      {edition ? (
        // En mode édition, la catégorie a toujours une ligne (même vide) pour porter son crayon.
        <div className="mb-4">
          <Editable
            edition={edition}
            champ="mesure_vers_objectif.categorie_objectif"
            valeurBrute={categorieObjectif ?? ""}
          >
            <div className="min-h-8 pr-11 pt-1.5">
              {categorie ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" aria-hidden="true" />
                  {categorieObjectif}
                </span>
              ) : (
                <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-300">
                  Aucune catégorie
                </span>
              )}
            </div>
          </Editable>
        </div>
      ) : (
        categorie
      )}

      <div className="flex flex-col md:flex-row">
        <div className="min-w-0 flex-1 pb-5 md:pb-0 md:pr-6">
          {editionMesure ? (
            <Editable edition={editionMesure} champ="proposition.texteOriginal" valeurBrute={titre} multiligne>
              <div className="pr-11">{mesure}</div>
            </Editable>
          ) : (
            mesure
          )}
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-3 border-t border-zinc-200 pt-5 md:border-t-0 md:border-l md:pt-0 md:pl-6">
          {/* Horizontale sur desktop, verticale sur mobile — jamais de
              flèche horizontale compressée sous 768px (voir la demande
              d'origine), donc deux icônes distinctes plutôt qu'une seule
              pivotée en CSS. */}
          <span className="shrink-0" aria-hidden="true">
            <ArrowIcon direction="right" className="hidden h-4 w-4 text-orange-500 md:block" />
            <ArrowIcon direction="down" className="h-4 w-4 text-orange-500 md:hidden" />
          </span>
          {editionObjectif ? (
            <div className="min-w-0 flex-1">
              <Editable
                edition={editionObjectif}
                champ="mesure_vers_objectif.objectif_court"
                valeurBrute={objectifCourt}
                multiligne
              >
                <div className="pr-11">{objectif}</div>
              </Editable>
            </div>
          ) : (
            <div className="min-w-0">{objectif}</div>
          )}
        </div>
      </div>
    </div>
  );
}
