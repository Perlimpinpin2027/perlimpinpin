import { formaterValeur, hautEchelle, texteDonnee } from "@/lib/formats-graphiques";
import { ListeSources } from "./elements";

// Graphiques du dossier « Mouvement social » (`graphique` des blocs de la
// partie « Comprendre la crise » et de la chronologie), en HTML et Tailwind,
// sans bibliothèque. Quatre types : barres, barresGroupees, barreEmpilee,
// entonnoir. Tous les textes et chiffres viennent du JSON.
// Règles communes : barres de 22 px de haut au plus, bout arrondi côté valeur,
// valeur au bout de la barre (dans la barre, en blanc, au-delà de 80 % de la
// largeur), textes en couleurs de texte, info-bulle « libellé : valeur » au
// survol, tableau des données repliable sous chaque graphique.

const BLEU = "#2a78d6";
const GRIS = "#d4d4d8";
const COULEURS_SERIES = ["#2a78d6", "#eb6834"];
const COULEURS_SEGMENTS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100"];
// Segment sur lequel le texte est écrit en noir (le jaune), en blanc ailleurs.
const SEGMENT_TEXTE_NOIR = "#eda100";
const BLEUS_ENTONNOIR = ["#104281", "#2a78d6", "#86b6ef"];

// Part d'une valeur dans l'échelle, bornée entre 0 et 100 %.
const pourcentage = (valeur, haut) => Math.min(100, Math.max(0, (valeur / haut) * 100));

// Lignes de repère verticales très claires (quarts de l'échelle).
function Reperes() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      {[25, 50, 75].map((position) => (
        <span key={position} className="absolute inset-y-0 w-px bg-zinc-100" style={{ left: `${position}%` }} />
      ))}
    </div>
  );
}

// Info-bulle au survol (ou au focus clavier) d'une barre.
function Bulle({ texte }) {
  return (
    <span
      role="tooltip"
      className="pointer-events-none absolute bottom-full left-0 z-10 mb-1.5 hidden whitespace-nowrap rounded-md bg-zinc-900 px-2 py-1 text-xs font-medium text-white shadow group-hover/barre:block group-focus-visible/barre:block"
    >
      {texte}
    </span>
  );
}

// Une barre horizontale dans sa piste : largeur `pct` %, valeur au bout, ou
// dedans quand elle risquerait de déborder : au-delà de 80 %, et plus tôt pour
// une valeur longue (« plus de 20 % »), sur la base d'une piste de téléphone
// d'environ 250 px (un caractère ≈ 2,8 % de la largeur).
function Barre({ pct, couleur, valeur, bulle, hauteur = "h-[22px]" }) {
  const dedans = pct > Math.min(80, 96 - valeur.length * 2.8);
  return (
    <div tabIndex={0} className={`group/barre relative ${hauteur} w-full outline-none`}>
      <Reperes />
      <div
        className="relative h-full rounded-r-[4px]"
        style={{ width: `${pct}%`, backgroundColor: couleur, minWidth: pct > 0 ? 2 : 0 }}
      >
        {dedans ? (
          <span className="absolute inset-y-0 right-2 flex items-center text-xs font-semibold text-white">{valeur}</span>
        ) : null}
      </div>
      {!dedans ? (
        <span
          className="absolute inset-y-0 flex items-center whitespace-nowrap pl-1.5 text-xs font-semibold text-zinc-800"
          style={{ left: `${pct}%` }}
        >
          {valeur}
        </span>
      ) : null}
      <Bulle texte={bulle} />
    </div>
  );
}

function GraphiqueBarres({ graphique }) {
  const { donnees = [], unite, max } = graphique;
  const haut = hautEchelle(max, donnees.map((d) => d.valeur));
  // Avec au moins une barre mise en avant : elles en bleu, les autres en gris.
  const avecAccent = donnees.some((d) => d.accent);
  return (
    <ul className="flex flex-col gap-3.5">
      {donnees.map((d) => (
        <li key={d.label} className="flex flex-col gap-1">
          <span className="text-sm leading-snug text-zinc-700">{d.label}</span>
          <Barre
            pct={pourcentage(d.valeur, haut)}
            couleur={!avecAccent || d.accent ? BLEU : GRIS}
            valeur={texteDonnee(d, unite)}
            bulle={`${d.label} : ${texteDonnee(d, unite)}`}
          />
        </li>
      ))}
    </ul>
  );
}

function Legende({ items }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-zinc-700">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-2.5 w-2.5 flex-none rounded-sm" style={{ backgroundColor: item.couleur }} />
          {item.label}
          {item.valeur ? <strong className="font-semibold text-zinc-900">{item.valeur}</strong> : null}
        </li>
      ))}
    </ul>
  );
}

function GraphiqueBarresGroupees({ graphique }) {
  const { donnees = [], series = [], unite, max } = graphique;
  const haut = hautEchelle(max, donnees.flatMap((d) => d.valeurs));
  return (
    <div className="flex flex-col gap-4">
      <Legende items={series.map((s, i) => ({ label: s.label, couleur: COULEURS_SERIES[i] }))} />
      <ul className="flex flex-col gap-4">
        {donnees.map((d) => (
          <li key={d.label} className="flex flex-col gap-1">
            <span className="text-sm leading-snug text-zinc-700">{d.label}</span>
            <div className="flex flex-col gap-1">
              {d.valeurs.map((valeur, i) => (
                <Barre
                  key={series[i]?.id ?? i}
                  pct={pourcentage(valeur, haut)}
                  couleur={COULEURS_SERIES[i]}
                  valeur={formaterValeur(valeur, unite)}
                  bulle={`${d.label}, ${series[i]?.label ?? ""} : ${formaterValeur(valeur, unite)}`}
                  hauteur="h-[18px]"
                />
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function GraphiqueBarreEmpilee({ graphique }) {
  const { segments = [], unite } = graphique;
  const total = segments.reduce((s, seg) => s + seg.valeur, 0) || 1;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex h-[22px] w-full gap-[2px]">
        {segments.map((seg, i) => {
          const couleur = COULEURS_SEGMENTS[i % COULEURS_SEGMENTS.length];
          const pct = (seg.valeur / total) * 100;
          const texte = formaterValeur(seg.valeur, unite);
          return (
            <div
              key={seg.label}
              tabIndex={0}
              className={`group/barre relative flex h-full items-center justify-center outline-none ${
                i === segments.length - 1 ? "rounded-r-[4px]" : ""
              }`}
              style={{ width: `${pct}%`, backgroundColor: couleur }}
            >
              {/* Valeur écrite seulement si le segment est assez large. */}
              {pct >= 12 ? (
                <span className={`text-xs font-semibold ${couleur === SEGMENT_TEXTE_NOIR ? "text-zinc-950" : "text-white"}`}>
                  {texte}
                </span>
              ) : null}
              <Bulle texte={`${seg.label} : ${texte}`} />
            </div>
          );
        })}
      </div>
      <Legende
        items={segments.map((seg, i) => ({
          label: seg.label,
          couleur: COULEURS_SEGMENTS[i % COULEURS_SEGMENTS.length],
          valeur: formaterValeur(seg.valeur, unite),
        }))}
      />
    </div>
  );
}

function GraphiqueEntonnoir({ graphique }) {
  const { etapes = [], unite } = graphique;
  const premiere = etapes[0]?.valeur || 1;
  return (
    <ul className="flex flex-col gap-3.5">
      {etapes.map((etape, i) => {
        const texte = texteDonnee(etape, unite);
        return (
          <li key={etape.label} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-3 text-sm leading-snug">
              <span className="text-zinc-700">{etape.label}</span>
              <strong className="whitespace-nowrap font-semibold text-zinc-900">{texte}</strong>
            </div>
            <div tabIndex={0} className="group/barre relative h-[22px] w-full outline-none">
              <div
                className="h-full rounded-r-[4px]"
                style={{
                  width: `${pourcentage(etape.valeur, premiere)}%`,
                  backgroundColor: BLEUS_ENTONNOIR[Math.min(i, BLEUS_ENTONNOIR.length - 1)],
                  minWidth: 2,
                }}
              />
              <Bulle texte={`${etape.label} : ${texte}`} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// Tableau des données (accessibilité), mêmes valeurs que le graphique.
function TableauDonnees({ graphique }) {
  const { type, unite, series = [] } = graphique;
  let entetes;
  let lignes;
  if (type === "barresGroupees") {
    entetes = ["", ...series.map((s) => s.label)];
    lignes = (graphique.donnees ?? []).map((d) => [d.label, ...d.valeurs.map((v) => formaterValeur(v, unite))]);
  } else {
    const donnees = graphique.donnees ?? graphique.segments ?? graphique.etapes ?? [];
    entetes = null;
    lignes = donnees.map((d) => [d.label, texteDonnee(d, unite)]);
  }
  return (
    <details className="group/donnees text-xs text-zinc-500">
      <summary className="w-fit cursor-pointer list-none font-semibold text-zinc-600 underline decoration-zinc-300 underline-offset-2 hover:text-zinc-900 [&::-webkit-details-marker]:hidden">
        Voir les données <span aria-hidden="true" className="inline-block transition-transform group-open/donnees:rotate-180">▾</span>
      </summary>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full border-collapse text-left">
          {entetes ? (
            <thead>
              <tr>
                {entetes.map((entete, i) => (
                  <th key={i} scope="col" className="border-b border-zinc-200 py-1.5 pr-3 font-semibold text-zinc-700">
                    {entete}
                  </th>
                ))}
              </tr>
            </thead>
          ) : null}
          <tbody>
            {lignes.map(([label, ...valeurs]) => (
              <tr key={label} className="border-b border-zinc-100">
                <th scope="row" className="py-1.5 pr-3 font-normal text-zinc-700">
                  {label}
                </th>
                {valeurs.map((valeur, i) => (
                  <td key={i} className="whitespace-nowrap py-1.5 pr-3 font-semibold text-zinc-900">
                    {valeur}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

const PAR_TYPE = {
  barres: GraphiqueBarres,
  barresGroupees: GraphiqueBarresGroupees,
  barreEmpilee: GraphiqueBarreEmpilee,
  entonnoir: GraphiqueEntonnoir,
};

// Graphique complet dans sa carte blanche : titre, sous-titre, graphique,
// note, sources, données. Type inconnu : rien n'est affiché.
export default function Graphique({ graphique, className = "" }) {
  const Rendu = PAR_TYPE[graphique?.type];
  if (!Rendu) return null;
  return (
    <figure className={`flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 ${className}`}>
      <figcaption className="flex flex-col gap-1">
        <span className="text-base font-bold leading-snug text-zinc-950">{graphique.titre}</span>
        {graphique.sousTitre ? <span className="text-sm leading-snug text-slate-500">{graphique.sousTitre}</span> : null}
      </figcaption>
      <Rendu graphique={graphique} />
      {graphique.note ? <p className="text-[13px] leading-relaxed text-zinc-500">{graphique.note}</p> : null}
      <ListeSources sources={graphique.sources} />
      <TableauDonnees graphique={graphique} />
    </figure>
  );
}
