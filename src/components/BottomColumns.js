import Link from "next/link";
import { getScoreBadge } from "@/lib/score";

const scoreRanges = [
  {
    range: "70-100",
    label: "Plutôt fondé",
    color: "green",
    description: "S'appuie sur des données publiques vérifiables et cohérentes.",
  },
  {
    range: "40-69",
    label: "Partiellement fondé",
    color: "orange",
    description: "Repose sur des éléments réels mais incomplets ou fragiles.",
  },
  {
    range: "0-39",
    label: "Non étayé",
    color: "red",
    description: "Aucune donnée publique ne permet d'établir la faisabilité.",
  },
];

const badgeStyles = {
  green: "bg-green-50 text-green-700",
  orange: "bg-orange-50 text-orange-700",
  red: "bg-red-50 text-red-700",
};

const scoreTextStyles = {
  green: "text-green-600",
  orange: "text-orange-600",
  red: "text-red-600",
};

const rangeStyles = {
  green: { border: "border-l-green-500", badge: "bg-green-50 text-green-700" },
  orange: { border: "border-l-orange-500", badge: "bg-orange-50 text-orange-700" },
  red: { border: "border-l-red-500", badge: "bg-red-50 text-red-700" },
};

function ColumnHeader({ title, subtitle, linkLabel }) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h2 className="text-base font-bold text-zinc-900">{title}</h2>
        {subtitle ? (
          <p className="mt-0.5 text-xs text-zinc-400">{subtitle}</p>
        ) : null}
      </div>
      {linkLabel ? (
        <a
          href="#"
          className="shrink-0 text-sm font-semibold text-blue-600 transition-colors hover:text-blue-800"
        >
          {linkLabel}
        </a>
      ) : null}
    </div>
  );
}

function TopDeclarationsColumn({ declarations }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6">
      <ColumnHeader
        title="Déclarations les plus consultées"
        linkLabel="Voir toutes →"
      />

      {declarations.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Aucune déclaration analysée pour le moment.
        </p>
      ) : (
        <ul className="flex flex-col gap-5">
          {declarations.map((item, index) => {
            const badge = getScoreBadge(item.score);
            return (
              <li key={`${item.name}-${index}`}>
                <Link
                  href={`/declarations/${item.propositionId}`}
                  className="-m-2 flex items-start gap-3 rounded-xl p-2 transition-colors hover:bg-zinc-50"
                >
                  <div
                    className="h-9 w-9 shrink-0 rounded-full bg-zinc-200"
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-zinc-900">
                      {item.name}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-sm font-medium text-zinc-800">
                      &ldquo;{item.quote}&rdquo;
                    </p>
                    <p className="mt-1 text-xs text-zinc-400">
                      {item.date} · {item.theme}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-sm font-bold text-zinc-900">
                      {item.score}
                      <span className="text-xs font-medium text-zinc-400">
                        /100
                      </span>
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badgeStyles[badge.color]}`}
                    >
                      {badge.label}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ScoreExplainerColumn() {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6">
      <ColumnHeader title="Comment fonctionne le score ?" />

      <p className="mb-6 text-sm leading-relaxed text-zinc-500">
        Le Score Perlimpinpin évalue la qualité informationnelle des
        déclarations sur 100 points.
      </p>

      <div className="flex flex-col gap-4">
        {scoreRanges.map((item) => (
          <div
            key={item.range}
            className={`border-l-4 pl-4 ${rangeStyles[item.color].border}`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-zinc-900">
                {item.range}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${rangeStyles[item.color].badge}`}
              >
                {item.label}
              </span>
            </div>
            <p className="mt-1 text-sm text-zinc-500">{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrendIndicator({ trend, delta }) {
  if (!trend) {
    return <span className="text-xs font-medium text-zinc-300">—</span>;
  }

  const isUp = trend === "up";
  return (
    <span
      className={`flex items-center gap-0.5 text-xs font-semibold ${isUp ? "text-green-600" : "text-red-600"}`}
    >
      {isUp ? "↗" : "↘"}
      {delta}
    </span>
  );
}

function ReliabilityIndexColumn({ candidates }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6">
      <ColumnHeader
        title="Indice de fiabilité des candidats"
        subtitle="Score moyen évolutif sur les 30 derniers jours"
        linkLabel="Voir tous les candidats →"
      />

      {candidates.length === 0 ? (
        <p className="text-sm text-zinc-500">Aucun candidat enregistré.</p>
      ) : (
        <ol className="flex flex-col gap-5">
          {candidates.map((candidate, index) => (
            <li key={candidate.name} className="flex items-center gap-3">
              <span className="w-4 shrink-0 text-sm font-semibold text-zinc-400">
                {index + 1}
              </span>
              <div
                className="h-9 w-9 shrink-0 rounded-full bg-zinc-200"
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-zinc-900">
                  {candidate.name}
                </p>
                <p className="mt-0.5 text-xs text-zinc-400">
                  {candidate.declarations} déclarations analysées
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <TrendIndicator trend={candidate.trend} delta={candidate.delta} />
                {candidate.avgScore == null ? (
                  <span className="text-xs font-medium text-zinc-400">
                    Pas encore noté
                  </span>
                ) : (
                  <span
                    className={`text-sm font-bold ${scoreTextStyles[getScoreBadge(candidate.avgScore).color]}`}
                  >
                    {candidate.avgScore}
                    <span className="text-xs font-medium text-zinc-400">
                      /100
                    </span>
                  </span>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default function BottomColumns({ topDeclarations, rankedCandidates }) {
  return (
    <div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-3">
      <TopDeclarationsColumn declarations={topDeclarations} />
      <ScoreExplainerColumn />
      <ReliabilityIndexColumn candidates={rankedCandidates} />
    </div>
  );
}
