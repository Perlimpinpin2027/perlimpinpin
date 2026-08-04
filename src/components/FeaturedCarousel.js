"use client";

import { useState } from "react";
import FeaturedCard from "@/components/FeaturedCard";

export default function FeaturedCarousel({ items }) {
  const [index, setIndex] = useState(0);
  // Sens du dernier déplacement, pour choisir l'animation d'entrée de la
  // carte suivante (slide depuis la droite en "next", depuis la gauche en
  // "prev") — pas utilisé pour la sélection directe via les points.
  const [direction, setDirection] = useState("next");

  if (items.length === 0) {
    return <FeaturedCard />;
  }

  const total = items.length;
  const current = items[index];

  const goPrev = () => {
    setDirection("prev");
    setIndex((i) => (i - 1 + total) % total);
  };
  const goNext = () => {
    setDirection("next");
    setIndex((i) => (i + 1) % total);
  };
  const goTo = (targetIndex) => {
    setDirection(targetIndex > index ? "next" : "prev");
    setIndex(targetIndex);
  };

  return (
    <FeaturedCard
      key={index}
      {...current}
      currentIndex={index}
      total={total}
      direction={direction}
      onPrev={goPrev}
      onNext={goNext}
      onSelect={goTo}
    />
  );
}
