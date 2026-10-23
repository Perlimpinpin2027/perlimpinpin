import { Fragment } from "react";
import Header from "@/components/Header";
import SectionHeading from "@/components/SectionHeading";
import { getScoreBands } from "@/lib/score";
import { DOSSIER } from "@/lib/couleurs-dossier";
import { compterParCandidat, mesuresParCandidat, partsLeviers } from "@/lib/releve-securite";
import DOSSIER_MS from "../../../../data/hors-series/mouvement-social.json" with { type: "json" };
import INVENTAIRE from "../../../../data/hors-series/inventaire-prises-de-parole.json" with { type: "json" };
import OngletsPropositions from "./OngletsPropositions";
import TriangleLeviers from "./TriangleLeviers";
import { SectionComprendre } from "./BlocsComprendre";
import Graphique from "./Graphiques";
import { COULEURS_ORIENTATION } from "./couleurs-orientation";
import { couleurStatut } from "./statuts";
import { Etiquette, LienSource, ListeSources, OMBRE_CARTE, Pastille, Prose, TuileChiffre } from "./elements";

// Dossier n°2 « Mouvement social » (/dossiers/mouvement-social) : les
// propositions des candidats après les violences du 17 octobre 2026, classées
// par levier. Son JSON n'a pas la structure de celui du plan budgétaire RN,
// d'où cette route dédiée (prioritaire sur /dossiers/[slug]), avec les mêmes
// styles. Tout le texte vient de data/hors-series/mouvement-social.json ;
// aucune note n'y est écrite.
// Le triangle des leviers et la section « Le relevé complet » sont calculés à
// partir du relevé des prises de parole (inventaire-prises-de-parole.json,
// remplacé à chaque actualisation), voir src/lib/releve-securite.js.
// Tant que `visible` vaut false, le dossier n'est pas inscrit dans le registre
// (src/lib/hors-series.js) : absent de /dossiers, du carrousel de l'accueil et
// du sitemap, non indexé, mais accessible par son adresse.

export const metadata = {
  title: `${DOSSIER_MS.titre} | Perlimpinpin`,
  description: DOSSIER_MS.chapo,
  ...(DOSSIER_MS.visible ? {} : { robots: { index: false, follow: false } }),
};

// La chronologie marque « à venir » les dates postérieures au jour : la page
// est régénérée toutes les heures pour que la date du jour reste à jour.
export const revalidate = 3600;

// Ordre des sections si le JSON n'en donne pas.
const ORDRE_PAR_DEFAUT = [
  "entete",
  "essentiel",
  "chiffres",
  "chronologie",
  "comprendre",
  "perimetre",
  "triangle",
  "propositions",
  "textesEnCours",
  "toutesLesAnalyses",
  "releve",
  "methode",
  "sources",
];

// Date du jour à Paris, au format du JSON (« 2026-10-23 »).
function dateDuJour() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());
}

const SECTION = "w-full px-6 pb-14 sm:px-8 sm:pb-16";
const CONTENEUR = "mx-auto w-full max-w-[1280px]";
const TITRE_SECTION = "font-sans text-3xl font-extrabold tracking-tight text-zinc-950 sm:text-[2.125rem]";

// Date du relevé (« 2026-10-22 ») en toutes lettres : « 22 octobre 2026 ».
function dateEnLettres(iso) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${iso}T00:00:00Z`),
  );
}

// « Relevé mis à jour le 22 octobre 2026 » (libellé du JSON de contenu, date
// du relevé).
function MiseAJour({ libelle, date, className = "" }) {
  if (!libelle || !date) return null;
  return (
    <p className={`text-[13px] text-zinc-400 ${className}`}>
      {libelle} {dateEnLettres(date)}
    </p>
  );
}

// Une mesure du relevé : date, support, mesure, levier, source. Les mesures
// non retenues sont grisées, avec le motif de leur exclusion.
function MesureReleve({ mesure, libelleNonRetenue }) {
  const retenue = mesure.retenue;
  return (
    <li className={`flex flex-col gap-1.5 border-t border-zinc-100 py-3.5 first:border-t-0 ${retenue ? "" : "text-zinc-400"}`}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <span className={`font-semibold ${retenue ? "text-zinc-900" : ""}`}>{mesure.dateAffichee}</span>
        {mesure.support ? <span className={retenue ? "text-zinc-500" : ""}>· {mesure.support}</span> : null}
        {mesure.levier ? (
          <Pastille className={retenue ? "bg-zinc-100 text-zinc-600" : "bg-zinc-50 text-zinc-400"}>
            Levier {mesure.levier}
          </Pastille>
        ) : null}
        {!retenue ? (
          <Pastille className="bg-zinc-100 text-zinc-500">{libelleNonRetenue}</Pastille>
        ) : null}
      </div>
      <p className={`text-[15px] leading-snug ${retenue ? "text-zinc-800" : ""}`}>{mesure.mesure}</p>
      {mesure.quiParle && mesure.quiParle !== mesure.candidat ? (
        <p className="text-xs italic">par {mesure.quiParle}</p>
      ) : null}
      {!retenue && mesure.motifNonRetenue ? <p className="text-xs">{mesure.motifNonRetenue}</p> : null}
      <LienSource source={mesure.url ? { label: "Source", url: mesure.url } : null} prefixe="" className="w-fit" />
    </li>
  );
}

export default function DossierMouvementSocialPage() {
  const {
    numero,
    etiquette,
    titre,
    chapo,
    boutons = [],
    photo,
    essentiel,
    chiffres,
    ordreSections,
    chronologie,
    comprendre,
    triangle,
    perimetre,
    statuts,
    onglets = [],
    messageOngletVide,
    propositions = [],
    textesEnCours,
    toutesLesAnalyses,
    methode,
    sources = [],
    releve,
  } = DOSSIER_MS;

  // Relevé des prises de parole : comptes par candidat (triangle) et mesures
  // groupées par candidat (section « Le relevé complet »).
  const candidatsTriangle = compterParCandidat(INVENTAIRE).map((c) => ({ ...c, parts: partsLeviers(c) }));
  const triangleVide = !candidatsTriangle.some((c) => c.parts);
  const releveParCandidat = mesuresParCandidat(INVENTAIRE);

  const aujourdhui = dateDuJour();

  // Barème du plus bas au plus haut (0-19 Irréaliste … 85-100 Exemplaire).
  const bandes = getScoreBands().slice().reverse();

  // Chaque section de la page, affichées dans l'ordre de `ordreSections`
  // du JSON.
  const sections = {
    entete: (
      <>
        {/* En-tête : texte à gauche, illustration à droite (sous le texte
            sur téléphone). Tant que `photo` est absente du JSON, un cadre
            vide réserve sa place. */}
        <section className="w-full px-6 pb-14 pt-12 sm:px-8 sm:pb-16 sm:pt-20">
          <div className={`${CONTENEUR} grid grid-cols-1 items-center gap-10 lg:grid-cols-[1.08fr_1fr] lg:gap-14`}>
            <div className="flex flex-col gap-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-zinc-950 ${DOSSIER.fond}`}>
                  Dossier n°{numero}
                </span>
                <Etiquette>{etiquette}</Etiquette>
              </div>

              <h1 className="font-sans text-4xl font-extrabold leading-[1.04] tracking-[-0.035em] text-zinc-950 sm:text-5xl xl:text-6xl">
                {titre}
              </h1>

              <p className="max-w-2xl text-lg leading-relaxed text-slate-500 sm:text-xl">{chapo}</p>

              {boutons.length ? (
                <div className="mt-2 flex flex-wrap gap-3">
                  {boutons.map((bouton, i) => (
                    <a
                      key={bouton.ancre}
                      href={bouton.ancre}
                      className={
                        i === 0
                          ? "inline-flex min-h-12 items-center gap-3 rounded-xl bg-blue-950 px-6 py-3.5 text-base font-medium text-white transition-colors hover:bg-blue-900"
                          : "inline-flex min-h-12 items-center rounded-xl border border-zinc-200 bg-white px-6 py-3.5 text-base font-medium text-zinc-900 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
                      }
                    >
                      {bouton.label}
                      {i === 0 ? <span aria-hidden="true">→</span> : null}
                    </a>
                  ))}
                </div>
              ) : null}
            </div>

            <figure className="mx-auto flex w-full max-w-md flex-col gap-2 lg:max-w-[460px]">
              {photo?.src ? (
                <>
                  <div className={`relative aspect-[4/5] w-full overflow-hidden rounded-2xl ring-1 ring-zinc-100 ${DOSSIER.fondClair} ${OMBRE_CARTE}`}>
                    <img
                      src={photo.src}
                      alt={photo.alt ?? ""}
                      className="absolute inset-0 h-full w-full object-cover object-top"
                    />
                  </div>
                  {photo.credit ? <figcaption className="text-xs text-zinc-400">{photo.credit}</figcaption> : null}
                </>
              ) : (
                <div
                  aria-hidden="true"
                  className={`aspect-[4/5] w-full rounded-2xl border-2 border-dashed border-[#f8b444]/60 ${DOSSIER.fondClair}`}
                />
              )}
            </figure>
          </div>
        </section>
      </>
    ),
    essentiel: (
      <>
        {/* L'essentiel */}
        {essentiel ? (
          <section className={SECTION}>
            <div className={`${CONTENEUR} flex flex-col gap-5`}>
              <h2 className="max-w-3xl text-[1.75rem] font-extrabold tracking-tight text-zinc-950">
                {essentiel.titre}
              </h2>
              <Prose paragraphes={essentiel.paragraphes} chapo />
            </div>
          </section>
        ) : null}
      </>
    ),
    chiffres: (
      <>
        {/* Ce qui s'est passé : chiffres avec leur source */}
        {chiffres?.items?.length ? (
          <section className={SECTION}>
            <div className={`${CONTENEUR} flex flex-col gap-5`}>
              <Etiquette>{chiffres.titre}</Etiquette>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {chiffres.items.map((item) => (
                  <TuileChiffre key={item.valeur} item={item} />
                ))}
              </div>
              {chiffres.note ? <p className="text-[13px] text-zinc-400">{chiffres.note}</p> : null}
            </div>
          </section>
        ) : null}
      </>
    ),
    chronologie: (
      <>
        {/* Chronologie : frise à gauche, graphique des manifestants à droite
            (fixe au défilement sur ordinateur), puis note et sources. Les dates
            postérieures à aujourd'hui (`dateIso`) sont marquées « à venir ». */}
        {chronologie?.items?.length ? (
          <section className={SECTION}>
            <div className={`${CONTENEUR} flex flex-col gap-6`}>
              <Etiquette>{chronologie.titre}</Etiquette>
              <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-2 lg:gap-14">
                <ol className={`flex flex-col gap-6 border-l-2 ${DOSSIER.bordure} pl-6`}>
                  {chronologie.items.map((item) => {
                    const aVenir = item.dateIso != null && item.dateIso > aujourdhui;
                    return (
                      <li key={`${item.date}-${item.texte}`} className="relative flex flex-col gap-1">
                        <span
                          aria-hidden="true"
                          className={`absolute -left-[33px] top-1 h-4 w-4 rounded-full ${
                            aVenir ? "border-2 border-dashed border-zinc-400 bg-white" : `border-[3px] border-white ${DOSSIER.fond}`
                          }`}
                        />
                        <span className={`text-sm font-bold uppercase tracking-wide ${aVenir ? "text-zinc-400" : "text-zinc-950"}`}>
                          {item.date}
                          {aVenir ? " · à venir" : ""}
                        </span>
                        <p className={`text-base leading-relaxed ${aVenir ? "text-zinc-500" : "text-zinc-700"}`}>{item.texte}</p>
                      </li>
                    );
                  })}
                </ol>
                <div className="flex flex-col gap-3 lg:sticky lg:top-28">
                  {chronologie.graphique ? <Graphique graphique={chronologie.graphique} /> : null}
                  {chronologie.note ? <p className="text-[13px] leading-relaxed text-zinc-500">{chronologie.note}</p> : null}
                  <ListeSources sources={chronologie.sources} />
                </div>
              </div>
            </div>
          </section>
        ) : null}
      </>
    ),
    comprendre: (
      <>
        {/* Comprendre la crise : filet noir, surtitre, grand titre, intro, puis
            les sections numérotées, affichées par le moteur de blocs. */}
        {comprendre ? (
          <section id={comprendre.id ?? "comprendre"} className={`${SECTION} scroll-mt-20`}>
            <div className={`${CONTENEUR} flex flex-col gap-14`}>
              <div className="flex flex-col gap-4 border-t-2 border-zinc-950 pt-7">
                <Etiquette couleur="text-zinc-500">{comprendre.surtitre}</Etiquette>
                <h2 className="max-w-4xl font-serif text-4xl font-bold leading-[1.08] tracking-tight text-zinc-950 sm:text-5xl">
                  {comprendre.titre}
                </h2>
                {comprendre.intro ? (
                  <p className="max-w-3xl text-lg leading-relaxed text-slate-500 sm:text-xl">{comprendre.intro}</p>
                ) : null}
              </div>
              {comprendre.sections?.map((section, i) => (
                <SectionComprendre key={section.id} section={section} numero={i + 1} />
              ))}
            </div>
          </section>
        ) : null}
      </>
    ),
    perimetre: (
      <>
        {/* Ce que couvre ce dossier : encadré */}
        {perimetre ? (
          <section className={SECTION}>
            <div className={CONTENEUR}>
              <div className={`flex max-w-4xl flex-col gap-2.5 rounded-2xl px-6 py-5 sm:px-7 sm:py-6 ${DOSSIER.fondClair}`}>
                <h2 className="text-xl font-bold tracking-tight text-zinc-950">{perimetre.titre}</h2>
                <p className="text-base leading-relaxed text-zinc-700">{perimetre.texte}</p>
              </div>
            </div>
          </section>
        ) : null}
      </>
    ),
    triangle: (
      <>
        {/* Où se situent les candidats ? : triangle des leviers, calculé à
            partir du relevé des prises de parole. */}
        {triangle ? (
          <section className={SECTION}>
            <div className={`${CONTENEUR} flex flex-col gap-5`}>
              <h2 className={TITRE_SECTION}>{triangle.titre}</h2>
              <Prose paragraphes={[triangle.texte, triangle.texteCouleur].filter(Boolean)} />
              <div className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-8">
                {triangleVide ? (
                  <p className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-5 py-4 text-[15px] leading-relaxed text-zinc-500">
                    {triangle.messageVide}
                  </p>
                ) : (
                  <TriangleLeviers candidats={candidatsTriangle} onglets={onglets} legende={triangle.legende ?? []} />
                )}
                <div className="mt-6 flex flex-col gap-3 border-t border-zinc-100 pt-5">
                  <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-zinc-700">
                    {triangle.legende?.map((item) => (
                      <li key={item.id} className="flex items-center gap-2">
                        <span aria-hidden="true" className={`h-3.5 w-3.5 flex-none rounded-full ${COULEURS_ORIENTATION[item.id] ?? ""}`} />
                        {item.label}
                      </li>
                    ))}
                  </ul>
                  {triangle.regle ? <p className="max-w-4xl text-[14px] leading-relaxed text-slate-500">{triangle.regle}</p> : null}
                  {triangle.note ? <p className="max-w-4xl text-[14px] leading-relaxed text-slate-500">{triangle.note}</p> : null}
                  <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    <MiseAJour libelle={releve?.libelleMaj} date={INVENTAIRE.dateReleve} />
                    {triangle.lienReleve ? (
                      <a
                        href={triangle.lienReleve.ancre}
                        className={`text-sm font-semibold text-zinc-950 underline decoration-2 underline-offset-4 ${DOSSIER.soulignement}`}
                      >
                        {triangle.lienReleve.label} <span aria-hidden="true">↓</span>
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : null}
      </>
    ),
    statuts: (
      <>
        {/* Nouvelle annonce ou idée déjà défendue ? : les étiquettes de
            statut, une couleur chacune (badges des propositions). */}
        {statuts ? (
          <section className={SECTION}>
            <div className={`${CONTENEUR} flex flex-col gap-5`}>
              <h2 className={TITRE_SECTION}>{statuts.titre}</h2>
              <p className="max-w-3xl text-lg leading-relaxed text-zinc-700">{statuts.texte}</p>
              <ul className="flex flex-wrap gap-2.5">
                {statuts.items?.map((statut) => (
                  <li key={statut.id}>
                    <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${couleurStatut(statut.id)}`}>
                      {statut.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}
      </>
    ),
    propositions: (
      <>
        {/* Les propositions, un onglet par levier. Le JSON ne prévoit pas
            de titre pour cette section. */}
        <section id="propositions" className={`${SECTION} scroll-mt-20`}>
          <div className={CONTENEUR}>
            <OngletsPropositions
              onglets={onglets}
              propositions={propositions}
              messageOngletVide={messageOngletVide}
            />
          </div>
        </section>
      </>
    ),
    textesEnCours: (
      <>
        {/* À noter : des textes déjà en discussion */}
        {textesEnCours?.items?.length ? (
          <section className={SECTION}>
            <div className={CONTENEUR}>
              <div className={`flex max-w-4xl flex-col gap-4 rounded-2xl px-6 py-5 sm:px-7 sm:py-6 ${DOSSIER.fondClair}`}>
                <h2 className="text-xl font-bold tracking-tight text-zinc-950">{textesEnCours.titre}</h2>
                <ul className="flex list-disc flex-col gap-3 pl-5 text-base leading-relaxed text-zinc-700">
                  {textesEnCours.items.map((item) => (
                    <li key={item.texte}>
                      {item.texte} <LienSource source={item.source} prefixe="" className="whitespace-nowrap" />
                    </li>
                  ))}
                </ul>
                {textesEnCours.note ? <p className="text-[13px] text-zinc-500">{textesEnCours.note}</p> : null}
              </div>
            </div>
          </section>
        ) : null}
      </>
    ),
    toutesLesAnalyses: (
      <>
        {/* Toutes les analyses du dossier : la liste des fiches publiées
            viendra avec les propositions ; en attendant, `messageVide`. */}
        {toutesLesAnalyses ? (
          <section id="analyses" className={`${SECTION} scroll-mt-20`}>
            <div className={`${CONTENEUR} flex flex-col gap-5`}>
              <h2 className={TITRE_SECTION}>{toutesLesAnalyses.titre}</h2>
              <p className="max-w-3xl text-lg leading-relaxed text-zinc-700">{toutesLesAnalyses.texte}</p>
              <p className="max-w-3xl rounded-2xl border border-dashed border-zinc-300 bg-white/60 px-6 py-5 text-[15px] leading-relaxed text-zinc-500">
                {toutesLesAnalyses.messageVide}
              </p>
            </div>
          </section>
        ) : null}
      </>
    ),
    releve: (
      <>
        {/* Le relevé complet : un bloc repliable par candidat (ordre de
            `nomTri`), mesures triées par date, règles de comptage. */}
        {releve ? (
          <section id="releve" className={`${SECTION} scroll-mt-20`}>
            <div className={`${CONTENEUR} flex flex-col gap-5`}>
              <h2 className={TITRE_SECTION}>{releve.titre}</h2>
              <p className="max-w-3xl text-lg leading-relaxed text-zinc-700">{releve.texte}</p>
              <MiseAJour libelle={releve.libelleMaj} date={INVENTAIRE.dateReleve} />

              {INVENTAIRE.regles?.length ? (
                <div className={`flex max-w-4xl flex-col gap-3 rounded-2xl px-6 py-5 sm:px-7 sm:py-6 ${DOSSIER.fondClair}`}>
                  <h3 className="text-lg font-bold tracking-tight text-zinc-950">Comment nous comptons</h3>
                  <ul className="flex list-disc flex-col gap-2 pl-5 text-[15px] leading-relaxed text-zinc-700">
                    {INVENTAIRE.regles.map((regle) => (
                      <li key={regle}>{regle}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="flex max-w-4xl flex-col gap-3">
                {releveParCandidat.map((groupe) => (
                  <details key={groupe.candidat} className="group rounded-2xl border border-zinc-200 bg-white">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 sm:px-6 [&::-webkit-details-marker]:hidden">
                      <span className="min-w-0">
                        <span className="block text-base font-bold text-zinc-950">{groupe.candidat}</span>
                        <span className="block text-xs text-zinc-500">
                          {groupe.parti} ·{" "}
                          <strong className="font-semibold text-zinc-700">
                            {groupe.total} mesure{groupe.total > 1 ? "s" : ""} comptée{groupe.total > 1 ? "s" : ""}
                          </strong>
                        </span>
                      </span>
                      <span aria-hidden="true" className="flex-none text-zinc-400 transition-transform group-open:rotate-180">
                        ▾
                      </span>
                    </summary>
                    <ul className="border-t border-zinc-100 px-5 sm:px-6">
                      {groupe.mesures.map((mesure) => (
                        <MesureReleve key={mesure.id} mesure={mesure} libelleNonRetenue={releve.libelleNonRetenue} />
                      ))}
                    </ul>
                  </details>
                ))}
              </div>
            </div>
          </section>
        ) : null}
      </>
    ),
    methode: (
      <>
        {/* Méthode et limites, avec l'échelle des verdicts du site. */}
        {methode ? (
          <section id="methode" className={`${SECTION} scroll-mt-20`}>
            <div className={CONTENEUR}>
              <div className="flex max-w-4xl flex-col gap-2.5 rounded-2xl border border-zinc-200 bg-white p-6 text-[15px] leading-relaxed text-slate-500 sm:p-7">
                <SectionHeading>{methode.titre}</SectionHeading>
                {methode.paragraphes?.map((paragraphe) => (
                  <p key={paragraphe}>{paragraphe}</p>
                ))}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {bandes.map((bande) => (
                    <Pastille key={bande.label} className={bande.badge}>
                      {bande.min}-{bande.max} {bande.label}
                    </Pastille>
                  ))}
                </div>
              </div>
            </div>
          </section>
        ) : null}
      </>
    ),
    sources: (
      <>
        {/* Sources ; une source avec `ancre` (le relevé) est un lien interne. */}
        {sources.length ? (
                  <section className={SECTION}>
          <div className={`${CONTENEUR} flex flex-col gap-2`}>
                    <Etiquette>Sources</Etiquette>
                    <ul className="flex flex-col gap-1.5 text-[13px] leading-snug">
                      {/* Une source avec `ancre` (le relevé) est un lien interne. */}
                      {sources.map((source) => (
                        <li key={source.url ?? source.ancre}>
                          {source.url ? (
                            <a
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-zinc-600 underline decoration-zinc-300 underline-offset-2 transition-colors hover:text-zinc-950"
                            >
                              {source.label} <span aria-hidden="true">↗</span>
                            </a>
                          ) : (
                            <a
                              href={source.ancre}
                              className="text-zinc-600 underline decoration-zinc-300 underline-offset-2 transition-colors hover:text-zinc-950"
                            >
                              {source.label} <span aria-hidden="true">↑</span>
                            </a>
                          )}
                        </li>
                      ))}
                    </ul>
                    </div>
        </section>
        ) : null}
      </>
    ),
  };

  return (
    <div className="flex min-h-screen flex-col bg-page-gradient font-sans">
      <Header />

      <main className="flex w-full flex-col">
        {(ordreSections ?? ORDRE_PAR_DEFAUT).map((nom) => (
          <Fragment key={nom}>{sections[nom] ?? null}</Fragment>
        ))}
      </main>
    </div>
  );
}
