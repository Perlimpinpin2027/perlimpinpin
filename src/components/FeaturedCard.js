"use client";

import Link from "next/link";
import { useRef } from "react";
import { getScoreBadge } from "@/lib/score";

const SWIPE_THRESHOLD_PX = 40;

const colorStyles = {
  red: { score: "text-red-600", badge: "bg-red-50 text-red-700" },
  orange: { score: "text-orange-600", badge: "bg-orange-50 text-orange-700" },
  green: { score: "text-green-600", badge: "bg-green-50 text-green-700" },
};

// Carte unique "Prix Perlimpinpin de la semaine" : photo à gauche (~40%),
// contenu à droite, score + bouton en pied de carte pleine largeur. Reçoit
// l'état du carrousel (index/total/callbacks) depuis FeaturedCarousel.
export default function FeaturedCard({
  propositionId,
  quoteText,
  personName,
  personPhotoUrl,
  score,
  verdictDescription,
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

  const badge = getScoreBadge(score);
  const colors = colorStyles[badge.color];

  return (
    <div className="flex h-full flex-col rounded-2xl border border-zinc-200 bg-white">
      <div className="flex flex-1 flex-col sm:flex-row">
        <div
          className="relative w-full shrink-0 sm:w-2/5"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <img
            src={personPhotoUrl || "/avatar-placeholder.svg"}
            alt={personName}
            className="h-56 w-full rounded-t-2xl object-cover object-top sm:absolute sm:inset-0 sm:h-full sm:rounded-2xl sm:m-3 sm:w-[calc(100%-1.5rem)]"
          />

          <button
            type="button"
            aria-label="Citation précédente"
            onClick={onPrev}
            disabled={total <= 1}
            className="absolute left-2 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-lg text-zinc-700 shadow transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-0 sm:flex"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Citation suivante"
            onClick={onNext}
            disabled={total <= 1}
            className="absolute right-5 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-lg text-zinc-700 shadow transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-0 sm:flex"
          >
            ›
          </button>

          {total > 1 ? (
            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/35 px-2.5 py-1 backdrop-blur-sm">
              <span className="text-[11px] font-medium text-white">
                {currentIndex + 1}/{total}
              </span>
              <div className="flex items-center gap-1">
                {Array.from({ length: total }).map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    aria-label={`Voir la citation ${index + 1}`}
                    onClick={() => onSelect?.(index)}
                    className={`h-1.5 w-1.5 rounded-full transition-colors ${index === currentIndex ? "bg-white" : "bg-white/40 hover:bg-white/70"}`}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col p-6 sm:p-8">
          <span className="text-xs font-bold uppercase tracking-widest text-red-600">
            Prix Perlimpinpin de la semaine
          </span>
          <p className="mt-3 text-sm font-semibold text-zinc-900">{personName}</p>
          <blockquote className="mt-2 font-serif text-2xl font-bold leading-tight text-zinc-900">
            &ldquo;{quoteText}&rdquo;
          </blockquote>
          {verdictDescription ? (
            <p className="mt-3 text-sm leading-relaxed text-zinc-500">
              {verdictDescription}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-zinc-100 px-6 py-5 sm:px-8">
        <div className="flex items-center gap-3">
          <span className={`text-4xl font-extrabold tracking-tight ${colors.score}`}>
            {score}
            <span className="text-base font-semibold text-zinc-400">/100</span>
          </span>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${colors.badge}`}
          >
            {badge.label}
          </span>
        </div>

        <Link
          href={`/declarations/${propositionId}`}
          className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800"
        >
          Voir l&apos;analyse complète
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  );
}
