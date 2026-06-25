import Link from "next/link";
import { FlashcardSetSummary } from "@/types";

// components/SetCard.tsx
//
// Renders ONE flashcard set on the dashboard as a sticky-note-style
// card. Color rotates through our accent palette based on the set's
// position, purely for visual variety (not tied to any data meaning) --
// this is what gives the dashboard its "pinned to a corkboard" feel.

const ACCENTS = [
  { bg: "bg-coral-light", border: "border-coral", bar: "bg-coral", tilt: "tilt-left" },
  { bg: "bg-sky-light", border: "border-sky", bar: "bg-sky", tilt: "tilt-right" },
  { bg: "bg-mint-light", border: "border-mint", bar: "bg-mint", tilt: "tilt-left" },
  { bg: "bg-sunshine-light", border: "border-sunshine", bar: "bg-sunshine", tilt: "tilt-right" },
  { bg: "bg-grape-light", border: "border-grape", bar: "bg-grape", tilt: "tilt-left" },
];

export default function SetCard({
  set,
  index,
}: {
  set: FlashcardSetSummary;
  index: number;
}) {
  const accent = ACCENTS[index % ACCENTS.length];
  const progress = set.total_cards > 0 ? Math.round((set.known_cards / set.total_cards) * 100) : 0;

  return (
    <Link
      href={`/sets/${set.id}`}
      className={`block rounded-2xl border-2 ${accent.border} ${accent.bg} p-5 ${accent.tilt} hover:rotate-0 hover:-translate-y-1 transition-all shadow-card hover:shadow-card-hover`}
    >
      <h3 className="font-display font-semibold text-lg leading-snug mb-3 line-clamp-2">
        {set.title}
      </h3>

      <div className="flex items-center justify-between text-xs text-ink/60 mb-2">
        <span>{set.total_cards} cards</span>
        <span>{progress}% known</span>
      </div>

      <div className="h-2 w-full bg-white/60 rounded-full overflow-hidden">
        <div className={`h-full ${accent.bar} rounded-full`} style={{ width: `${progress}%` }} />
      </div>
    </Link>
  );
}
