import Link from "next/link";
import { useRef } from "react";

const SWIPE_THRESHOLD_PX = 40;

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
  const touchStartX = useRef(null);

  function handleTouchStart(event) {
    touchStartX.current = event.touches[0].clientX;
  }

  function handleTouchEnd(event) {
    if (touchStartX.current === null) return;
    const deltaX = event.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;

    if (total <= 1) return;
    if (deltaX > SWIPE_THRESHOLD_PX) onPrev?.();
    else if (deltaX < -SWIPE_THRESHOLD_PX) onNext?.();
  }

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
    <div
      className="flex h-full flex-col rounded-2xl border border-zinc-200 bg-white p-6"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Hauteur minimale fixe sur desktop : la rangée de flèches en dessous
          reste toujours à la même hauteur, quelle que soit la longueur du
          texte affiché pour chaque proposition. */}
      <div className="md:min-h-[280px]">
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
      </div>

      <div className="mt-auto flex items-center justify-center gap-4 border-t border-zinc-100 pt-5 text-sm text-zinc-500 md:mt-6">
        <button
          type="button"
          aria-label="Citation précédente"
          onClick={onPrev}
          disabled={total <= 1}
          className="hidden h-10 w-10 items-center justify-center rounded-full text-lg transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent md:flex"
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
          className="hidden h-10 w-10 items-center justify-center rounded-full text-lg transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent md:flex"
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
