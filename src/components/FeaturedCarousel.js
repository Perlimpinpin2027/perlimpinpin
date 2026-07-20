"use client";

import { useState } from "react";
import FeaturedCard from "@/components/FeaturedCard";

export default function FeaturedCarousel({ items }) {
  const [index, setIndex] = useState(0);

  if (items.length === 0) {
    return <FeaturedCard />;
  }

  const total = items.length;
  const current = items[index];

  const goPrev = () => setIndex((i) => (i - 1 + total) % total);
  const goNext = () => setIndex((i) => (i + 1) % total);

  return (
    <FeaturedCard
      {...current}
      currentIndex={index}
      total={total}
      onPrev={goPrev}
      onNext={goNext}
      onSelect={setIndex}
    />
  );
}
