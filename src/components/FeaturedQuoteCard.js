import Link from "next/link";

export default function FeaturedQuoteCard({
  propositionId,
  quoteText,
  personName,
  personPhotoUrl,
  personRole,
  dateLabel,
  currentIndex = 0,
  total = 0,
  onPrev,
  onNext,
  onSelect,
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
        <img
          src={personPhotoUrl || "/avatar-placeholder.svg"}
          alt={personName}
          className="h-10 w-10 shrink-0 rounded-full object-cover"
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
          onClick={onPrev}
          disabled={total <= 1}
          className="flex h-7 w-7 items-center justify-center rounded-full transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
        >
          ‹
        </button>
        <span className="text-xs font-medium text-zinc-600">
          {currentIndex + 1}/{total}
        </span>
        <button
          type="button"
          aria-label="Citation suivante"
          onClick={onNext}
          disabled={total <= 1}
          className="flex h-7 w-7 items-center justify-center rounded-full transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
        >
          ›
        </button>
      </div>

      {total > 1 ? (
        <div className="mt-3 flex items-center justify-center gap-1.5">
          {Array.from({ length: total }).map((_, index) => (
            <button
              key={index}
              type="button"
              aria-label={`Voir la citation ${index + 1}`}
              onClick={() => onSelect?.(index)}
              className={`h-1.5 w-1.5 rounded-full transition-colors ${index === currentIndex ? "bg-zinc-800" : "bg-zinc-200 hover:bg-zinc-400"}`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
