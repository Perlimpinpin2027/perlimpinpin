import Link from "next/link";
import { getScoreBadge, getScoreBands } from "@/lib/score";

const bandDescriptions = {
  Exemplaire: "Solidement démontré, chiffré et cohérent avec les données disponibles.",
  "Solide et chiffré": "S'appuie sur des données publiques vérifiables et cohérentes.",
  "Plausible sous condition": "Réaliste mais dépend de conditions ou de financements incertains.",
  "Partiellement fondé": "Repose sur des éléments réels mais incomplets ou fragiles.",
  Fragile: "Peu d'éléments vérifiables viennent appuyer cette déclaration.",
  Irréaliste: "Aucune donnée publique ne permet d'établir la faisabilité.",
};

function ColumnHeader({ title, subtitle, linkLabel, linkHref, icon }) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h2 className="flex items-center gap-2 text-base font-bold text-zinc-900">
          {icon}
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-0.5 text-xs text-zinc-400">{subtitle}</p>
        ) : null}
      </div>
      {linkLabel ? (
        <Link
          href={linkHref || "#"}
          className="shrink-0 text-sm font-semibold text-blue-600 transition-colors hover:text-blue-800"
        >
          {linkLabel}
        </Link>
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
        linkHref="/declarations"
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
                  <img
                    src={item.photoUrl || "/avatar-placeholder.svg"}
                    alt={item.name}
                    className="h-9 w-9 shrink-0 rounded-lg object-cover object-top"
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
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badge.badgeClass}`}
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
      <ColumnHeader
        title="Comment fonctionne le score ?"
        icon={
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            className="h-5 w-5 shrink-0 text-blue-600"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            />
          </svg>
        }
      />

      <p className="mb-6 text-sm leading-relaxed text-zinc-500">
        Le Score Perlimpinpin évalue la qualité informationnelle des
        déclarations sur 100 points.
      </p>

      <div className="flex flex-col gap-4">
        {getScoreBands().map((item) => (
          <div
            key={item.label}
            className={`border-l-4 pl-4 ${item.border}`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-zinc-900">
                {item.min}-{item.max}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${item.badge}`}
              >
                {item.label}
              </span>
            </div>
            <p className="mt-1 text-sm text-zinc-500">
              {bandDescriptions[item.label]}
            </p>
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
        linkHref="/candidats"
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
              <img
                src={candidate.photoUrl || "/avatar-placeholder.svg"}
                alt={candidate.name}
                className="h-9 w-9 shrink-0 rounded-lg object-cover object-top"
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
                    className={`text-sm font-bold ${getScoreBadge(candidate.avgScore).scoreClass}`}
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
