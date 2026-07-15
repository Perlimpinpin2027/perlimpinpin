"use client";

import { useState } from "react";
import FeaturedQuoteCard from "@/components/FeaturedQuoteCard";
import ScoreCard from "@/components/ScoreCard";

// Un seul state d'index partagé entre la carte "Prix de la semaine" et la
// carte "Score Perlimpinpin" pour qu'elles restent toujours synchronisées.
export default function FeaturedCarousel({ items }) {
  const [index, setIndex] = useState(0);

  if (items.length === 0) {
    return (
      <>
        <FeaturedQuoteCard />
        <ScoreCard />
      </>
    );
  }

  const total = items.length;
  const current = items[index];

  const goPrev = () => setIndex((i) => (i - 1 + total) % total);
  const goNext = () => setIndex((i) => (i + 1) % total);

  return (
    <>
      <FeaturedQuoteCard
        {...current}
        currentIndex={index}
        total={total}
        onPrev={goPrev}
        onNext={goNext}
        onSelect={setIndex}
      />
      <ScoreCard
        score={current.score}
        verdictDescription={current.verdictDescription}
      />
    </>
  );
}
