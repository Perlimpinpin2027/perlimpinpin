import Link from "next/link";
import { getScoreBands, PLAFOND_DECLENCHEUR_LABELS } from "@/lib/score";

// Bloc "Détail du score" de la fiche déclaration, barème 2026 (5 critères
// sur 100, voir data/prompt-methodologie.md) — maquette : barre, note et
// badge de qualification par critère, sous-composantes d'Opérationnalité &
// Moyens en retrait, échelle des 6 paliers du score total, état de la
// RÈGLE DE PLAFOND.
//
// Les badges reprennent tels quels les champs qualification_* stockés dans
// contenuComplet.notation_detaillee (étape 3 du pipeline) : aucune
// qualification n'est jamais déduite de la note. Valeur absente ou non
// reconnue → pas de badge et barre neutre. `barLight` : teinte atténuée de
// la barre agrégée d'Opérationnalité & Moyens (total calculé, pas un
// critère noté indépendamment). Ordre des clés = du plus favorable au plus
// défavorable (utilisé par worstQualification).
const QUALIFICATIONS = {
  SOLIDE: {
    label: "Solide",
    badge: "bg-green-50 text-green-700",
    bar: "bg-green-700",
    barLight: "bg-green-300",
  },
  INCERTAIN: {
    label: "Incertain documenté",
    badge: "bg-amber-50 text-amber-700",
    bar: "bg-amber-700",
    barLight: "bg-amber-300",
  },
  FRAGILE: { label: "Fragile", badge: "bg-red-50 text-red-700", bar: "bg-red-700", barLight: "bg-red-300" },
};
const QUALIFICATION_ORDER = Object.keys(QUALIFICATIONS);

// Qualification la plus défavorable parmi celles reconnues (null si aucune) :
// même logique que la RÈGLE DE PLAFOND, où un seul volet FRAGILE suffit à
// pénaliser tout Opérationnalité & Moyens.
function worstQualification(values) {
  const ranks = values.map((value) => QUALIFICATION_ORDER.indexOf(value)).filter((rank) => rank >= 0);
  return ranks.length ? QUALIFICATION_ORDER[Math.max(...ranks)] : null;
}

const NEUTRAL_BADGE = "bg-zinc-100 text-zinc-600";
const NEUTRAL_BAR = "bg-zinc-400";

// Clés de notation_detaillee : note, note maximale, qualification associée.
const OPERATIONNALITE = {
  key: "operationnalite_moyens_total",
  label: "Opérationnalité & Moyens",
  max: 30,
  sousCriteres: [
    { key: "operationnalite_juridique", label: "Juridique", max: 10, qualif: "qualification_juridique" },
    { key: "operationnalite_budgetaire", label: "Budgétaire", max: 10, qualif: "qualification_budgetaire" },
    {
      key: "operationnalite_moyens_humains",
      label: "Moyens humains",
      max: 10,
      qualif: "qualification_moyens_humains",
    },
  ],
};

const CRITERES = [
  { key: "efficacite", label: "Efficacité", max: 30, qualif: "qualification_efficacite" },
  {
    key: "effets_rebonds_externalites",
    label: "Effets rebonds & Externalités",
    max: 20,
    qualif: "qualification_effets_rebonds",
  },
  { key: "degre_preparation", label: "Degré de préparation", max: 10, qualif: "qualification_preparation" },
  { key: "alignement_logique", label: "Alignement & Logique globale", max: 10, qualif: "qualification_alignement" },
];

// Une ligne critère. Mobile : libellé + badge sur une ligne, barre + note
// (largeur fixe, pour que les barres restent alignées) en dessous. À partir
// de sm : 4 colonnes alignées (libellé, barre, note, badge) — les deux
// conteneurs passent en display: contents pour que leurs enfants
// deviennent des cellules de la grille, replacées par order. Colonnes
// libellé/note/badge au plus juste (texte sm/xs) : le bloc vit dans la
// colonne principale, à côté de la carte "Score Perlimpinpin", et chaque
// pixel gagné va à la barre.
function CritereRow({ label, note, max, badge, isSub = false }) {
  const pct = typeof note === "number" ? Math.min(100, Math.max(0, (note / max) * 100)) : 0;
  return (
    <div className="flex flex-col gap-1.5 py-2 sm:grid sm:grid-cols-[12.5rem_minmax(0,1fr)_3rem_8.75rem] sm:items-center sm:gap-x-3 sm:py-1.5">
      <div className="flex items-center justify-between gap-3 sm:contents">
        <p className={`text-sm sm:order-1 ${isSub ? "pl-4 text-zinc-600" : "text-zinc-900"}`}>
          {isSub ? (
            <span aria-hidden="true" className="mr-1 text-zinc-400">
              ↳
            </span>
          ) : null}
          {label}
        </p>
        <span className="shrink-0 sm:order-4">
          {badge ? (
            <span
              className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${badge.className}`}
            >
              {badge.label}
            </span>
          ) : null}
        </span>
      </div>

      <div className="flex items-center gap-4 sm:contents">
        <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-zinc-100 sm:order-2">
          <div className={`h-full rounded-full ${badge?.bar ?? NEUTRAL_BAR}`} style={{ width: `${pct}%` }} />
        </div>
        <p className="w-12 shrink-0 text-right font-mono text-sm sm:order-3 sm:w-auto">
          <span className="font-semibold text-zinc-900">{note ?? "—"}</span>
          <span className="text-zinc-400">/{max}</span>
        </p>
      </div>
    </div>
  );
}

function qualificationBadge(value) {
  const entry = QUALIFICATIONS[value];
  return entry ? { label: entry.label, className: entry.badge, bar: entry.bar } : null;
}

// Échelle des 6 paliers (src/lib/score.js), du plus bas au plus haut, largeur
// de chaque segment proportionnelle à l'étendue de son intervalle. Le palier
// du score total est mis en évidence (trait foncé + libellé en gras).
function ScoreScale({ score }) {
  const bands = getScoreBands().slice().reverse();
  return (
    <ol className="grid grid-cols-3 gap-x-2 gap-y-4 sm:flex sm:gap-1.5">
      {bands.map((band) => {
        const active = score >= band.min && score <= band.max;
        return (
          <li
            key={band.label}
            style={{ flexGrow: band.max - band.min + 1, flexBasis: 0 }}
            className={`border-t-[3px] pt-2 ${active ? "border-zinc-900" : "border-zinc-200"}`}
            aria-current={active ? "true" : undefined}
          >
            <p className={`text-xs leading-snug ${active ? "font-semibold text-zinc-900" : "text-zinc-500"}`}>{band.label}</p>
            <p className={`mt-1 font-mono text-xs ${active ? "text-zinc-900" : "text-zinc-400"}`}>
              {band.min} à {band.max}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

export default function ScoreDetail({ notation, score }) {
  const plafondLabel = PLAFOND_DECLENCHEUR_LABELS[notation.plafond_declencheur] ?? notation.plafond_declencheur;
  const operationnaliteQualif = worstQualification(
    OPERATIONNALITE.sousCriteres.map(({ qualif }) => notation[qualif]),
  );

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6">
      <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Détail du score</h2>

      <div className="mt-4 flex flex-col">
        <CritereRow
          label={OPERATIONNALITE.label}
          note={notation[OPERATIONNALITE.key]}
          max={OPERATIONNALITE.max}
          badge={{
            label: "Somme de 3 volets",
            className: NEUTRAL_BADGE,
            bar: QUALIFICATIONS[operationnaliteQualif]?.barLight ?? NEUTRAL_BAR,
          }}
        />
        {OPERATIONNALITE.sousCriteres.map(({ key, label, max, qualif }) => (
          <CritereRow
            key={key}
            label={label}
            note={notation[key]}
            max={max}
            badge={qualificationBadge(notation[qualif])}
            isSub
          />
        ))}
        {CRITERES.map(({ key, label, max, qualif }) => (
          <CritereRow
            key={key}
            label={label}
            note={notation[key]}
            max={max}
            badge={qualificationBadge(notation[qualif])}
          />
        ))}
      </div>

      <div className="mt-6">
        <ScoreScale score={score} />
      </div>

      <p className="mt-5 font-mono text-sm text-zinc-500">
        {notation.plafond_applique
          ? `Le plafond d'opérationnalité est déclenché (volet jugé fragile : ${plafondLabel ?? "?"}) : Opérationnalité & Moyens est limité à 10/30.`
          : "Le plafond d'opérationnalité n'est pas déclenché."}
      </p>

      <Link
        href="/methode"
        className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 transition-colors hover:text-blue-800"
      >
        Voir comment nous notons
        <span aria-hidden="true">→</span>
      </Link>
    </section>
  );
}
