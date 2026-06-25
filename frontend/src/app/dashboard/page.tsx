"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import ProtectedRoute from "@/components/ProtectedRoute";
import Navbar from "@/components/Navbar";
import SetCard from "@/components/SetCard";
import NewSetModal from "@/components/NewSetModal";
import { api } from "@/lib/api";
import { FlashcardSetSummary, FlashcardSet } from "@/types";

export default function DashboardPage() {
  const [sets, setSets] = useState<FlashcardSetSummary[] | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchSets();
  }, []);

  async function fetchSets() {
    try {
      const response = await api.get("/flashcards/");
      setSets(response.data);
    } catch {
      setSets([]);
    }
  }

  function handleCreated(newSet: FlashcardSet) {
    setIsModalOpen(false);
    router.push(`/sets/${newSet.id}`);
  }

  // Roll the per-set numbers up into a quick "how am I doing overall" strip.
  // This is the kind of glance-able summary a real product would lead with,
  // rather than dropping straight into a bare list of cards.
  const totalSets = sets?.length ?? 0;
  const totalCards = sets?.reduce((sum, s) => sum + s.total_cards, 0) ?? 0;
  const totalKnown = sets?.reduce((sum, s) => sum + s.known_cards, 0) ?? 0;
  const masteryPercent = totalCards > 0 ? Math.round((totalKnown / totalCards) * 100) : 0;

  return (
    <ProtectedRoute>
      <Navbar />
      <main className="max-w-5xl mx-auto px-5 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-3xl font-semibold">Your flashcard sets</h1>
            <p className="text-ink/60 mt-1 text-sm">
              {sets === null ? "Loading..." : `${totalSets} set${totalSets === 1 ? "" : "s"}`}
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-5 py-3 rounded-full bg-coral text-paper font-medium shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all whitespace-nowrap"
          >
            + New set
          </button>
        </div>

        {/* ---- Stats strip ---- */}
        {sets !== null && sets.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-10">
            <StatCard label="Sets" value={totalSets} color="sky" />
            <StatCard label="Total cards" value={totalCards} color="grape" />
            <StatCard label="Mastered" value={`${masteryPercent}%`} color="mint" />
          </div>
        )}

        {sets === null && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 rounded-2xl bg-ink/5 animate-pulse" />
            ))}
          </div>
        )}

        {sets !== null && sets.length === 0 && (
          <div className="text-center py-20 border-2 border-dashed border-ink/15 rounded-2xl">
            <EmptyStateIllustration />
            <p className="font-display text-xl font-semibold mt-4 mb-2">No flashcard sets yet</p>
            <p className="text-ink/60 text-sm mb-6">
              Paste your first paragraph of notes and we&apos;ll build your cards.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-5 py-3 rounded-full bg-coral text-paper font-medium shadow-card hover:shadow-card-hover transition-all"
            >
              Create your first set
            </button>
          </div>
        )}

        {sets !== null && sets.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {sets.map((set, i) => (
              <motion.div
                key={set.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
              >
                <SetCard set={set} index={i} />
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {isModalOpen && (
        <NewSetModal onClose={() => setIsModalOpen(false)} onCreated={handleCreated} />
      )}
    </ProtectedRoute>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color: "sky" | "grape" | "mint";
}) {
  const bg = { sky: "bg-sky-light", grape: "bg-grape-light", mint: "bg-mint-light" }[color];
  const border = { sky: "border-sky", grape: "border-grape", mint: "border-mint" }[color];
  const text = { sky: "text-sky-dark", grape: "text-grape-dark", mint: "text-mint-dark" }[color];

  return (
    <div className={`rounded-2xl border-2 ${border} ${bg} px-5 py-4`}>
      <p className={`font-display text-2xl font-semibold ${text}`}>{value}</p>
      <p className="text-xs font-medium text-ink/60 mt-0.5">{label}</p>
    </div>
  );
}

function EmptyStateIllustration() {
  return (
    <svg width="120" height="90" viewBox="0 0 120 90" className="mx-auto" fill="none">
      <rect x="14" y="18" width="56" height="68" rx="8" transform="rotate(-8 42 52)" fill="#DDEEFF" stroke="#3DA9FC" strokeWidth="2" />
      <rect x="46" y="10" width="56" height="68" rx="8" transform="rotate(6 74 44)" fill="#FFE3DE" stroke="#FF6B5B" strokeWidth="2" />
      <line x1="58" y1="34" x2="86" y2="34" transform="rotate(6 74 44)" stroke="#FF6B5B" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
      <line x1="58" y1="44" x2="78" y2="44" transform="rotate(6 74 44)" stroke="#FF6B5B" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}
