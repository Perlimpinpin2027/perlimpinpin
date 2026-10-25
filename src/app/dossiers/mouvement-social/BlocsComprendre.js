import { dateDuJour, LienSource, ListeSources, Pastille, TitreNumerote } from "./elements";
import Graphique from "./Graphiques";

// Moteur de blocs du dossier « Mouvement social » : sections de « Comprendre
// la crise » et volets de « Pour aller plus loin ». Chaque bloc est affiché
// selon son `type`, dans la charte du dossier (variables CSS --ms-…, voir
// charte.js). Tous les textes et chiffres viennent du JSON. Un type inconnu
// n'affiche rien.

// Grilles (une seule colonne sur téléphone). Classes écrites en entier pour
// que Tailwind les repère.
const COLONNES = {
  2: "md:grid-cols-2",
  3: "md:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
};

// Encadrés : « info » sur jaune très pâle à bordure gauche jaune,
// « attention » sur gris clair à bordure gauche noire.
const TONS = {
  info: "border-l-4 border-(--ms-jaune) bg-(--ms-jaunePale)",
  attention: "border-l-4 border-(--ms-noir) bg-(--ms-gris200)/60",
};

// Niveaux de preuve : établi en noir, documenté en gris clair, signal à
// confirmer en jaune, non démontré en blanc à bordure grise en pointillés.
const COULEURS_NIVEAU = {
  etabli: "bg-(--ms-noir) text-white",
  documente: "bg-(--ms-gris200) text-(--ms-gris900)",
  signal: "bg-(--ms-jaune) text-(--ms-noir)",
  non: "border border-dashed border-(--ms-gris400) bg-white text-(--ms-gris600)",
};

const libelleDe = (legende, id) => legende?.find((l) => l.id === id)?.label ?? "";

function BlocTexte({ bloc }) {
  return (
    <div className="flex max-w-[72ch] flex-col gap-4 text-[17px] leading-relaxed text-(--ms-gris900)">
      {bloc.titre ? <h4 className="text-lg font-extrabold tracking-[-0.02em] text-(--ms-noir)">{bloc.titre}</h4> : null}
      {bloc.paragraphes?.map((paragraphe) => (
        <p key={paragraphe}>{paragraphe}</p>
      ))}
      <ListeSources sources={bloc.sources} />
    </div>
  );
}

function BlocGraphique({ bloc }) {
  return <Graphique graphique={bloc.graphique} />;
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
    <div className={`flex max-w-4xl flex-col gap-2.5 rounded-r-2xl px-6 py-5 text-[15px] leading-relaxed text-(--ms-gris900) sm:px-7 ${TONS[bloc.ton] ?? TONS.info}`}>
      {bloc.titre ? <p className="text-base font-extrabold text-(--ms-noir)">{bloc.titre}</p> : null}
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

function BlocCartes({ bloc }) {
  return (
    <div className={`grid grid-cols-1 gap-4 ${COLONNES[bloc.colonnes] ?? COLONNES[3]}`}>
      {bloc.items?.map((carte) => (
        <div key={carte.etiquette} className="flex flex-col gap-2 rounded-2xl border border-(--ms-gris200) bg-white p-5 sm:p-6">
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-(--ms-gris600)">
            {carte.etiquette}
          </span>
          <p className="text-2xl font-extrabold leading-tight tracking-[-0.03em] text-(--ms-noir) sm:text-[1.75rem]">{carte.chiffre}</p>
          <p className="text-[15px] leading-relaxed text-(--ms-gris900)">{carte.texte}</p>
          <LienSource source={carte.source} className="mt-auto pt-1" />
        </div>
      ))}
    </div>
  );
}

// Frise verticale dans une carte : puce jaune cerclée de noir, date en mono.
function BlocChronologie({ bloc }) {
  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-(--ms-gris200) bg-white p-5 sm:p-6">
      {bloc.titre ? <p className="text-base font-extrabold text-(--ms-noir)">{bloc.titre}</p> : null}
      <ol className="flex flex-col gap-5 border-l-2 border-(--ms-gris200) pl-5">
        {bloc.items?.map((item) => (
          <li key={`${item.date}-${item.texte}`} className="relative flex flex-col gap-0.5">
            <span
              aria-hidden="true"
              className="absolute -left-[28px] top-1 h-3.5 w-3.5 rounded-full border-2 border-(--ms-noir) bg-(--ms-jaune)"
            />
            <span className="font-mono text-xs font-bold uppercase tracking-[0.08em] text-(--ms-noir)">{item.date}</span>
            <p className="text-[15px] leading-relaxed text-(--ms-gris900)">{item.texte}</p>
          </li>
        ))}
      </ol>
      <ListeSources sources={bloc.sources} />
    </div>
  );
}

// Bloc mis en avant : grand cadre noir, demandes numérotées, citation.
function BlocRevendications({ bloc }) {
  return (
    <div className="flex flex-col gap-8 rounded-3xl bg-(--ms-noir) p-6 text-white sm:p-10">
      <div className="flex flex-col gap-3">
        <p className="text-2xl font-black leading-tight tracking-[-0.03em] sm:text-[2rem]">{bloc.titre}</p>
        {bloc.chapo ? <p className="max-w-3xl text-base leading-relaxed text-zinc-300 sm:text-lg">{bloc.chapo}</p> : null}
      </div>
      <ol className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-5">
        {bloc.items?.map((item, i) => (
          <li key={item.titre} className="flex flex-col gap-2 border-t-2 border-(--ms-jaune) pt-4">
            <span className="font-mono text-sm font-bold text-(--ms-jaune)">{String(i + 1).padStart(2, "0")}</span>
            <p className="text-base font-bold leading-snug text-white">{item.titre}</p>
            <p className="text-sm leading-relaxed text-zinc-400">{item.texte}</p>
          </li>
        ))}
      </ol>
      {bloc.citation?.texte ? (
        <figure className="flex flex-col gap-2">
          <blockquote className="text-2xl font-extrabold leading-snug tracking-[-0.02em] text-(--ms-jaune) sm:text-3xl">
            « {bloc.citation.texte} »
          </blockquote>
          {bloc.citation.auteur ? <figcaption className="text-sm text-zinc-400">{bloc.citation.auteur}</figcaption> : null}
        </figure>
      ) : null}
      <ListeSources sources={bloc.sources} />
    </div>
  );
}

// Rendez-vous à venir : les dates déjà passées (`dateIso` antérieure au jour)
// ne sont pas affichées. La page est régénérée toutes les heures.
function BlocAVenir({ bloc }) {
  const aujourdhui = dateDuJour();
  const items = (bloc.items ?? []).filter((item) => !item.dateIso || item.dateIso >= aujourdhui);
  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-(--ms-gris200)/60 p-5 sm:p-6">
      {bloc.titre ? <p className="text-base font-extrabold text-(--ms-noir)">{bloc.titre}</p> : null}
      {items.length ? (
        <ul className="flex flex-col divide-y divide-(--ms-gris200)">
          {items.map((item) => (
            <li key={`${item.date}-${item.texte}`} className="grid grid-cols-[6.5rem_1fr] gap-3 py-2.5 first:pt-0">
              <span className="pt-0.5 font-mono text-xs font-bold uppercase tracking-[0.08em] text-(--ms-gris600)">{item.date}</span>
              <span className="text-[15px] leading-relaxed text-(--ms-gris900)">{item.texte}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {bloc.note ? <p className="text-[13px] leading-relaxed text-(--ms-gris600)">{bloc.note}</p> : null}
      <ListeSources sources={bloc.sources} />
    </div>
  );
}

const PAR_TYPE = {
  texte: BlocTexte,
  graphique: BlocGraphique,
  grille: BlocGrille,
  encadre: BlocEncadre,
  cartes: BlocCartes,
  chronologie: BlocChronologie,
  revendications: BlocRevendications,
  aVenir: BlocAVenir,
};

export function Bloc({ bloc }) {
  const Rendu = PAR_TYPE[bloc?.type];
  return Rendu ? <Rendu bloc={bloc} /> : null;
}

// Tableau des niveaux de preuve (`comprendre.synthese`) : affirmation, badge
// du niveau, explication suivie d'un lien vers le détail. Les trois cellules
// s'empilent sur téléphone.
export function SyntheseNiveaux({ synthese }) {
  if (!synthese?.items?.length) return null;
  return (
    <div className="flex flex-col gap-4">
      {synthese.titre ? (
        <h3 className="text-xl font-extrabold tracking-[-0.02em] text-(--ms-noir) sm:text-2xl">{synthese.titre}</h3>
      ) : null}
      {synthese.texte ? <p className="max-w-[72ch] text-[17px] leading-relaxed text-(--ms-gris900)">{synthese.texte}</p> : null}
      <ul className="flex flex-col overflow-hidden rounded-2xl border border-(--ms-gris200) bg-white">
        {synthese.items.map((item) => (
          <li
            key={item.affirmation}
            className="grid grid-cols-1 gap-2 border-t border-(--ms-gris200) px-5 py-4 first:border-t-0 md:grid-cols-[minmax(0,1.3fr)_10.5rem_minmax(0,1.5fr)] md:items-start md:gap-5"
          >
            <p className="text-[15px] font-bold leading-snug text-(--ms-noir)">{item.affirmation}</p>
            <span>
              <Pastille className={COULEURS_NIVEAU[item.niveau] ?? COULEURS_NIVEAU.non}>{libelleDe(synthese.legende, item.niveau)}</Pastille>
            </span>
            <p className="text-sm leading-relaxed text-(--ms-gris600)">
              {item.explication}
              {item.renvoi ? (
                <>
                  {" "}
                  <a
                    href={item.renvoi}
                    className="whitespace-nowrap font-semibold text-(--ms-noir) underline decoration-(--ms-jaune) decoration-2 underline-offset-2"
                  >
                    → détail
                  </a>
                </>
              ) : null}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Une section de « Comprendre la crise » : titre avec son `num` dans un carré
// jaune, ancre sur son `id`, puis ses blocs.
export function SectionComprendre({ section }) {
  return (
    <section id={section.id} className="flex scroll-mt-24 flex-col gap-6">
      <TitreNumerote num={section.num} as="h3">
        {section.titre}
      </TitreNumerote>
      {section.blocs?.map((bloc, i) => (
        <Bloc key={i} bloc={bloc} />
      ))}
    </section>
  );
}
