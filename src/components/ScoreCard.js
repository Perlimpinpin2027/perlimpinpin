const flagStyles = {
  red: {
    score: "text-red-600",
    badge: "bg-red-50 text-red-700",
  },
  green: {
    score: "text-green-600",
    badge: "bg-green-50 text-green-700",
  },
};

export default function ScoreCard({
  score,
  flagLabel,
  flagColor = "red",
  verdictLabel,
  verdictDescription,
}) {
  const colors = flagStyles[flagColor] ?? flagStyles.red;

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
        className={`mt-4 inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${colors.badge}`}
      >
        <span aria-hidden="true">🚩</span>
        {flagLabel}
      </div>

      <p className="mt-5 text-sm font-bold text-zinc-900">{verdictLabel}</p>
      <p className="mt-1 text-sm leading-relaxed text-zinc-500">
        {verdictDescription}
      </p>
    </div>
  );
}
