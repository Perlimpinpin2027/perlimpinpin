import { getScoreBadge } from "@/lib/score";

const colorStyles = {
  red: {
    score: "text-red-600",
    badge: "bg-red-50 text-red-700",
  },
  orange: {
    score: "text-orange-600",
    badge: "bg-orange-50 text-orange-700",
  },
  green: {
    score: "text-green-600",
    badge: "bg-green-50 text-green-700",
  },
};

export default function ScoreCard({ score, verdictDescription }) {
  if (score == null) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-zinc-200 bg-white p-6 text-center">
        <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Score Perlimpinpin
        </span>
        <p className="mt-4 text-sm text-zinc-500">Pas encore de score.</p>
      </div>
    );
  }

  const badge = getScoreBadge(score);
  const colors = colorStyles[badge.color];

  return (
    <div className="flex h-full flex-col rounded-2xl border border-zinc-200 bg-white p-6">
      <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
        Score Perlimpinpin
      </span>

      <div className="mt-4 flex items-baseline gap-1.5">
        <span className={`text-5xl font-extrabold tracking-tight ${colors.score}`}>
          {score}
        </span>
        <span className="text-lg font-semibold text-zinc-400">/100</span>
      </div>

      <div
        className={`mt-4 inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold ${colors.badge}`}
      >
        {badge.label}
      </div>

      <p className="mt-5 text-sm leading-relaxed text-zinc-500">
        {verdictDescription}
      </p>
    </div>
  );
}
