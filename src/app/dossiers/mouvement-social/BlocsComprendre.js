import { DOSSIER } from "@/lib/couleurs-dossier";
import { LienSource, ListeSources, Pastille, TuileChiffre } from "./elements";
import Graphique from "./Graphiques";

// Moteur de blocs de la partie « Comprendre la crise » du dossier « Mouvement
// social » : chaque section (`comprendre.sections` du JSON) est une liste de
// blocs, affichés selon leur `type`. Tous les textes et chiffres viennent du
// JSON. Un type inconnu n'affiche rien.

// Grilles à 2 ou 3 colonnes (une seule sur téléphone). Classes écrites en
// entier pour que Tailwind les repère.
const COLONNES = {
  2: "md:grid-cols-2",
  3: "md:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
};

// Encadrés : « info » dans le jaune pâle des dossiers, « attention » en ambre
// pâle avec un filet ambre à gauche pour bien les distinguer.
const TONS = {
  info: DOSSIER.fondClair,
  attention: "border-l-4 border-amber-400 bg-amber-50",
};

// Pays : couleur de l'étiquette selon `lien` (libellés dans `legende`).
const COULEURS_LIEN = {
  foyer: `${DOSSIER.fond} text-zinc-950`,
  explicite: "bg-blue-100 text-blue-900",
  echo: "bg-violet-100 text-violet-800",
  parallele: "bg-zinc-200 text-zinc-700",
};

// Niveaux de preuve : établi vert, documenté bleu, signal ambre, non démontré
// gris.
const COULEURS_NIVEAU = {
  etabli: "bg-green-100 text-green-800",
  documente: "bg-blue-100 text-blue-800",
  signal: "bg-amber-100 text-amber-800",
  non: "bg-zinc-200 text-zinc-700",
};

const libelleDe = (legende, id) => legende?.find((l) => l.id === id)?.label ?? "";

function BlocTexte({ bloc }) {
  return (
    <div className="flex max-w-[72ch] flex-col gap-4 text-[17px] leading-relaxed text-zinc-700">
      {bloc.paragraphes?.map((paragraphe) => (
        <p key={paragraphe}>{paragraphe}</p>
      ))}
      <ListeSources sources={bloc.sources} />
    </div>
  );
}

function BlocGrille({ bloc }) {
  return (
    <div className={`grid grid-cols-1 items-start gap-5 ${COLONNES[bloc.colonnes] ?? COLONNES[2]}`}>
      {bloc.blocs?.map((enfant, i) => (
        <Bloc key={i} bloc={enfant} />
      ))}
    </div>
  );
}

function BlocEncadre({ bloc }) {
  return (
    <div className={`flex max-w-4xl flex-col gap-2.5 rounded-2xl px-6 py-5 text-[15px] leading-relaxed text-zinc-700 sm:px-7 ${TONS[bloc.ton] ?? TONS.info}`}>
      {bloc.titre ? <p className="text-base font-bold text-zinc-950">{bloc.titre}</p> : null}
      {bloc.texte ? <p>{bloc.texte}</p> : null}
      {bloc.liste?.length ? (
        <ul className="flex list-disc flex-col gap-1.5 pl-5">
          {bloc.liste.map((element) => (
            <li key={element}>{element}</li>
          ))}
        </ul>
      ) : null}
      <ListeSources sources={bloc.sources} />
    </div>
  );
}

// Trois étages reliés par une flèche (→ sur ordinateur, ↓ sur téléphone).
function BlocEtages({ bloc }) {
  const items = bloc.items ?? [];
  return (
    <div className="flex flex-col items-stretch gap-2 md:flex-row">
      {items.map((etage, i) => (
        <div key={etage.titre} className="contents">
          {i > 0 ? (
            <span aria-hidden="true" className="flex items-center justify-center text-2xl font-bold text-zinc-300">
              <span className="md:hidden">↓</span>
              <span className="hidden md:inline">→</span>
            </span>
          ) : null}
          <div className="flex flex-1 flex-col gap-2.5 rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">Étage {i + 1}</span>
            <p className="text-lg font-bold leading-snug text-zinc-950">{etage.titre}</p>
            <p className="text-[15px] leading-relaxed text-zinc-700">{etage.texte}</p>
            {etage.exemples?.length ? (
              <ul className="mt-auto flex flex-wrap gap-1.5 pt-1">
                {etage.exemples.map((exemple) => (
                  <li key={exemple}>
                    <Pastille className="bg-zinc-100 font-medium text-zinc-700">{exemple}</Pastille>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function BlocCartes({ bloc }) {
  return (
    <div className={`grid grid-cols-1 gap-4 ${COLONNES[bloc.colonnes] ?? COLONNES[3]}`}>
      {bloc.items?.map((carte) => (
        <div key={carte.etiquette} className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6">
          <span className={`w-fit rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-950 ${DOSSIER.fondClair}`}>
            {carte.etiquette}
          </span>
          <p className="text-2xl font-extrabold leading-tight tracking-tight text-blue-950 sm:text-[1.75rem]">{carte.chiffre}</p>
          <p className="text-[15px] leading-relaxed text-zinc-700">{carte.texte}</p>
          <LienSource source={carte.source} className="mt-auto pt-1" />
        </div>
      ))}
    </div>
  );
}

function BlocChiffres({ bloc }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {bloc.items?.map((item) => (
        <TuileChiffre key={item.valeur} item={item} />
      ))}
    </div>
  );
}

function BlocPays({ bloc }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {bloc.items?.map((item) => (
          <div key={item.pays} className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-lg font-bold text-zinc-950">{item.pays}</p>
              <Pastille className={COULEURS_LIEN[item.lien] ?? COULEURS_LIEN.parallele}>{libelleDe(bloc.legende, item.lien)}</Pastille>
            </div>
            {item.foyer ? <p className="text-sm font-semibold text-slate-500">{item.foyer}</p> : null}
            <p className="text-[15px] leading-relaxed text-zinc-700">{item.fait}</p>
            <LienSource source={item.source} className="mt-auto pt-1" />
          </div>
        ))}
      </div>
      {bloc.note ? <p className="max-w-4xl text-[13px] leading-relaxed text-zinc-500">{bloc.note}</p> : null}
    </div>
  );
}

// Tableau à trois colonnes (affirmation, niveau, explication) ; les cellules
// s'empilent sur téléphone.
function BlocNiveaux({ bloc }) {
  return (
    <ul className="flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white">
      {bloc.items?.map((item) => (
        <li
          key={item.affirmation}
          className="grid grid-cols-1 gap-2 border-t border-zinc-100 px-5 py-4 first:border-t-0 md:grid-cols-[minmax(0,1.3fr)_10.5rem_minmax(0,1.5fr)] md:items-start md:gap-5"
        >
          <p className="text-[15px] font-semibold leading-snug text-zinc-950">{item.affirmation}</p>
          <span>
            <Pastille className={COULEURS_NIVEAU[item.niveau] ?? COULEURS_NIVEAU.non}>{libelleDe(bloc.legende, item.niveau)}</Pastille>
          </span>
          <p className="text-sm leading-relaxed text-slate-500">{item.explication}</p>
        </li>
      ))}
    </ul>
  );
}

function BlocGraphique({ bloc }) {
  return <Graphique graphique={bloc.graphique} />;
}

const PAR_TYPE = {
  texte: BlocTexte,
  graphique: BlocGraphique,
  grille: BlocGrille,
  encadre: BlocEncadre,
  etages: BlocEtages,
  cartes: BlocCartes,
  chiffres: BlocChiffres,
  pays: BlocPays,
  niveaux: BlocNiveaux,
};

export function Bloc({ bloc }) {
  const Rendu = PAR_TYPE[bloc?.type];
  return Rendu ? <Rendu bloc={bloc} /> : null;
}

// Une section de « Comprendre la crise » : titre numéroté (01, 02…), ancre
// sur son `id`, puis ses blocs.
export function SectionComprendre({ section, numero }) {
  return (
    <section id={section.id} className="flex scroll-mt-24 flex-col gap-6">
      <h3 className="flex items-baseline gap-3 text-2xl font-extrabold leading-tight tracking-tight text-zinc-950 sm:text-[1.75rem]">
        <span className="text-base font-extrabold tabular-nums text-zinc-400">{String(numero).padStart(2, "0")}</span>
        <span>{section.titre}</span>
      </h3>
      {section.blocs?.map((bloc, i) => (
        <Bloc key={i} bloc={bloc} />
      ))}
    </section>
  );
}
