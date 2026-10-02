"use client";

import Link from "next/link";
import { useRef } from "react";
import { getScoreBadge } from "@/lib/score";

const SWIPE_THRESHOLD_PX = 40;

// Carte unique "Prix Perlimpinpin de la semaine" : photo à gauche (~40%,
// ratio fixe quel que soit le candidat), contenu à droite (texte tronqué à
// hauteur constante), score + bouton en pied de carte. Navigation par les
// points sur la photo (et swipe sur mobile), sans flèches latérales.
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
    // Maquette oct. 2026 : carte seule, sans flèches latérales ni halo
    // décoratif. On change de carte avec les points sur la photo (ou en
    // glissant le doigt sur mobile).
    <div className="relative">
      <div
        className={`flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-[0_24px_60px_-30px_rgba(30,41,82,0.35)] ring-1 ring-zinc-100 sm:h-[540px] sm:flex-row ${slideAnimationClass}`}
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
                    className={`h-2 w-2 rounded-full transition-colors ${dotIndex === currentIndex ? "bg-white" : "bg-white/40 hover:bg-white/70"}`}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col p-6 sm:p-8">
          <p className="text-lg font-medium tracking-tight text-zinc-900">{personName}</p>
          <blockquote className="mt-2 line-clamp-3 shrink-0 pb-0.5 font-sans text-2xl font-bold leading-tight tracking-tight text-blue-950 sm:text-[1.7rem]">
            {quoteText}
          </blockquote>
          {verdictDescription ? (
            <p className="mb-4 mt-3 line-clamp-4 text-base leading-snug text-slate-500">
              {verdictDescription}
            </p>
          ) : null}

          {/* Le score est l'info la plus importante après le titre : mis en
              valeur juste avant le bouton, pas relégué dans une barre basse.
              Même traitement que la carte score sticky des pages de
              déclaration (voir StickyScoreCard), pour une identité visuelle
              cohérente du "score Perlimpinpin" à travers le site. */}
          <div className="mt-auto border-t border-zinc-200 pt-5 max-sm:mt-2">
            <span className="font-mono text-xs uppercase tracking-widest text-slate-500">
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
            className="mt-5 flex w-full items-center justify-between gap-2 rounded-xl bg-blue-950 px-6 py-3.5 text-base font-medium text-white transition-colors hover:bg-blue-900"
          >
            Voir l&apos;analyse complète
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
