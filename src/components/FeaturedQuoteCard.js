import Link from "next/link";

export default function FeaturedQuoteCard({
  propositionId,
  quoteText,
  personName,
  personRole,
  dateLabel,
}) {
  if (!quoteText) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-zinc-200 bg-white p-6 text-center">
        <span className="text-xs font-bold uppercase tracking-widest text-red-600">
          Prix Perlimpinpin de la semaine
        </span>
        <p className="mt-4 text-sm text-zinc-500">
          Aucune analyse publiée pour le moment. Revenez bientôt.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col rounded-2xl border border-zinc-200 bg-white p-6">
      <span className="text-xs font-bold uppercase tracking-widest text-red-600">
        Prix Perlimpinpin de la semaine
      </span>

      <blockquote className="mt-4 text-xl font-bold leading-snug text-zinc-900">
        &ldquo;{quoteText}&rdquo;
      </blockquote>

      <div className="mt-6 flex items-center gap-3">
        <div
          className="h-10 w-10 shrink-0 rounded-full bg-zinc-200"
          aria-hidden="true"
        />
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-zinc-900">
            {personName}
          </span>
          <span className="text-xs text-zinc-500">
            {personRole}
            {dateLabel ? ` · ${dateLabel}` : ""}
          </span>
        </div>
      </div>

      <Link
        href={`/declarations/${propositionId}`}
        className="mt-6 inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-blue-600 transition-colors hover:text-blue-800"
      >
        Voir l&apos;analyse complète
        <span aria-hidden="true">→</span>
      </Link>

      <div className="mt-auto flex items-center justify-center gap-4 border-t border-zinc-100 pt-5 text-sm text-zinc-500">
        <button
          type="button"
          aria-label="Citation précédente"
          className="flex h-7 w-7 items-center justify-center rounded-full transition-colors hover:bg-zinc-100 hover:text-zinc-900"
        >
          ‹
        </button>
        <span className="text-xs font-medium text-zinc-600">1/5</span>
        <button
          type="button"
          aria-label="Citation suivante"
          className="flex h-7 w-7 items-center justify-center rounded-full transition-colors hover:bg-zinc-100 hover:text-zinc-900"
        >
          ›
        </button>
      </div>

      <div className="mt-3 flex items-center justify-center gap-1.5" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, index) => (
          <span
            key={index}
            className={`h-1.5 w-1.5 rounded-full ${index === 0 ? "bg-zinc-800" : "bg-zinc-200"}`}
          />
        ))}
      </div>
    </div>
  );
}
