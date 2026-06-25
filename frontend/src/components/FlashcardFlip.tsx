"use client";

import { useState, useEffect } from "react";
import { Flashcard } from "@/types";

// components/FlashcardFlip.tsx
//
// THE SIGNATURE INTERACTION of this app: a physical-feeling card flip,
// front = question, back = answer. Tapping/clicking the card flips it;
// the flip resets automatically whenever a NEW card is shown (via the
// `key` prop trick used by the parent review page).

export default function FlashcardFlip({ card }: { card: Flashcard }) {
  const [isFlipped, setIsFlipped] = useState(false);

  // If the same component instance somehow receives a different card
  // (shouldn't normally happen since the parent re-keys it, but this
  // is a safety net), make sure we reset to showing the question side.
  useEffect(() => {
    setIsFlipped(false);
  }, [card.id]);

  return (
    <div className="flip-scene w-full max-w-md h-72 mx-auto">
      <button
        onClick={() => setIsFlipped((f) => !f)}
        className={`flip-card relative w-full h-full cursor-pointer ${isFlipped ? "is-flipped" : ""}`}
        aria-label="Tap to flip card"
      >
        {/* FRONT — the question */}
        <div className="flip-face absolute inset-0 rounded-3xl border-2 border-sky bg-sky-light shadow-pop flex flex-col items-center justify-center p-8 text-center">
          <span className="text-xs font-semibold uppercase tracking-wide text-sky-dark mb-3">
            Question
          </span>
          <p className="font-display text-xl font-medium leading-snug text-ink">
            {card.question}
          </p>
          <span className="absolute bottom-5 text-xs text-ink/40">Tap to reveal answer</span>
        </div>

        {/* BACK — the answer */}
        <div className="flip-face flip-face-back absolute inset-0 rounded-3xl border-2 border-mint bg-mint-light shadow-pop flex flex-col items-center justify-center p-8 text-center">
          <span className="text-xs font-semibold uppercase tracking-wide text-mint-dark mb-3">
            Answer
          </span>
          <p className="font-display text-xl font-medium leading-snug text-ink">
            {card.answer}
          </p>
          <span className="absolute bottom-5 text-xs text-ink/40">Tap to see question again</span>
        </div>
      </button>
    </div>
  );
}
