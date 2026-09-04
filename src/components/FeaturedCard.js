"use client";

import Link from "next/link";
import { useRef } from "react";
import { getScoreBadge } from "@/lib/score";

const SWIPE_THRESHOLD_PX = 40;

// Carte unique "Prix Perlimpinpin de la semaine" : photo à gauche (~40%,
// ratio fixe quel que soit le candidat), contenu à droite (texte tronqué à
// hauteur constante), score + bouton en pied de carte. Les flèches sont
// hors de cet ensemble photo+texte, portées par le wrapper du carrousel.
// Reçoit l'état du carrousel (index/total/callbacks) depuis FeaturedCarousel.
export default function FeaturedCard({
  propositionId,
  quoteText,
  personName,
  personPhotoUrl,
  score,
  verdictDescription,
  currentIndex = 0,
  total = 0,
  direction = "next",
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
  // Anime l'entrée de la nouvelle carte à chaque changement d'index : le
  // remount déclenché par key={index} côté FeaturedCarousel relance
  // l'animation CSS à chaque fois, sans état de transition manuel à gérer.
  const slideAnimationClass =
    direction === "prev" ? "animate-slide-in-left" : "animate-slide-in-right";

  return (
    // Padding latéral réservé aux flèches (fix #2) : elles vivent hors de la
    // carte photo+texte, dans cette marge, jamais superposées à la photo.
    <div className="relative px-1 sm:px-14">
      {/* Forme de fond décorative derrière le portrait (voir maquette) :
          casse l'effet plat du cadre photo. Doit vivre hors de la carte
          (qui a overflow-hidden) pour pouvoir déborder légèrement de ses
          bords. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-6 -z-10 rounded-[2.5rem] bg-gradient-to-br from-rose-100 via-orange-100 to-blue-100 opacity-70 blur-2xl sm:right-[55%]"
      />
      <div
        className={`flex h-full flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white sm:h-[540px] sm:flex-row ${slideAnimationClass}`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Photo : hauteur fixe sur desktop (celle de la carte, elle-même
            fixée en dur ci-dessus — sm:h-[540px] — plutôt que dérivée du
            contenu) pour que la photo remplisse tout l'espace disponible,
            comme avant le premier correctif, tout en restant constante
            d'un candidat à l'autre. Sur mobile (empilé), pas de risque
            d'étirement croisé : aspect-ratio suffit. */}
        <div className="relative aspect-[4/5] w-full shrink-0 sm:aspect-auto sm:h-full sm:w-2/5">
          <img
            src={personPhotoUrl || "/avatar-placeholder.svg"}
            alt={personName}
            className="absolute inset-0 h-full w-full object-cover object-top"
          />

          {total > 1 ? (
            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/35 px-2.5 py-1 backdrop-blur-sm">
              <span className="text-[11px] font-medium text-white">
                {currentIndex + 1}/{total}
              </span>
              <div className="flex items-center gap-1">
                {Array.from({ length: total }).map((_, dotIndex) => (
                  <button
                    key={dotIndex}
                    type="button"
                    aria-label={`Voir la citation ${dotIndex + 1}`}
                    onClick={() => onSelect?.(dotIndex)}
                    className={`h-1.5 w-1.5 rounded-full transition-colors ${dotIndex === currentIndex ? "bg-white" : "bg-white/40 hover:bg-white/70"}`}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col p-6 sm:p-8">
          <p className="text-xl font-bold tracking-tight text-zinc-900">{personName}</p>
          <blockquote className="mt-2 line-clamp-3 font-sans text-2xl font-bold leading-tight text-zinc-900">
            &ldquo;{quoteText}&rdquo;
          </blockquote>
          {verdictDescription ? (
            <p className="mt-3 line-clamp-5 text-sm leading-relaxed text-zinc-500">
              {verdictDescription}
            </p>
          ) : null}

          {/* Le score est l'info la plus importante après le titre : mis en
              valeur juste avant le bouton, pas relégué dans une barre basse.
              Même traitement que la carte score sticky des pages de
              déclaration (voir StickyScoreCard), pour une identité visuelle
              cohérente du "score Perlimpinpin" à travers le site. */}
          <div className="mt-6 border-t border-zinc-100 pt-6">
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-zinc-500">
              Score Perlimpinpin
            </span>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className={`text-5xl font-extrabold tracking-tight ${badge.scoreClass}`}>
                {score}
              </span>
              <span className="text-lg font-semibold text-zinc-400">/100</span>
            </div>
            <div
              className={`mt-3 inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold ${badge.badgeClass}`}
            >
              {badge.label}
            </div>
          </div>

          <Link
            href={`/declarations/${propositionId}`}
            className="mt-5 inline-flex w-fit items-center gap-1.5 rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_28px_-10px_rgba(220,38,38,0.45)] transition-colors hover:bg-zinc-800"
          >
            Voir l&apos;analyse complète
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>

      {/* Flèches : hors de l'ensemble photo+texte, centrées verticalement
          sur toute la carte, masquées sur mobile (swipe tactile à la place,
          voir handleTouchStart/handleTouchEnd ci-dessus). */}
      <button
        type="button"
        aria-label="Citation précédente"
        onClick={onPrev}
        disabled={total <= 1}
        className="absolute left-0 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white text-2xl text-zinc-700 shadow-md ring-1 ring-zinc-200 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-0 sm:flex"
      >
        ‹
      </button>
      <button
        type="button"
        aria-label="Citation suivante"
        onClick={onNext}
        disabled={total <= 1}
        className="absolute right-0 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white text-2xl text-zinc-700 shadow-md ring-1 ring-zinc-200 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-0 sm:flex"
      >
        ›
      </button>
    </div>
  );
}
