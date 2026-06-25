"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Play, Check, X as XIcon, Circle } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import Navbar from "@/components/Navbar";
import { api } from "@/lib/api";
import { FlashcardSet } from "@/types";

// app/sets/[setId]/page.tsx
//
// Shows ONE flashcard set in full: every question/answer pair at a
// glance, plus the entry point into a review session. This is the
// "table of contents" view before the user commits to reviewing.

const STATUS_STYLES: Record<string, string> = {
  known: "bg-mint-light border-mint text-mint-dark",
  not_known: "bg-coral-light border-coral text-coral-dark",
  unseen: "bg-white border-ink/15 text-ink/50",
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  known: <Check size={13} />,
  not_known: <XIcon size={13} />,
  unseen: <Circle size={13} />,
};

const STATUS_LABEL: Record<string, string> = {
  known: "Known",
  not_known: "Not known",
  unseen: "Not reviewed",
};

export default function SetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const setId = params.setId as string;

  const [set, setSet] = useState<FlashcardSet | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api
      .get(`/flashcards/${setId}`)
      .then((res) => setSet(res.data))
      .catch(() => setNotFound(true));
  }, [setId]);

  return (
    <ProtectedRoute>
      <Navbar />
      <main className="max-w-3xl mx-auto px-5 py-10">
        <Link
          href="/dashboard"
          className="text-sm text-ink/50 hover:text-ink mb-6 inline-flex items-center gap-1.5"
        >
          <ArrowLeft size={15} />
          Back to dashboard
        </Link>

        {notFound && (
          <div className="text-center py-20">
            <p className="font-display text-xl font-semibold">Set not found</p>
            <p className="text-ink/60 text-sm mt-1">It may have been deleted, or the link is wrong.</p>
          </div>
        )}

        {!notFound && set === null && (
          <div className="space-y-3">
            <div className="h-8 w-1/2 bg-ink/5 rounded-lg animate-pulse" />
            <div className="h-24 bg-ink/5 rounded-2xl animate-pulse" />
            <div className="h-24 bg-ink/5 rounded-2xl animate-pulse" />
          </div>
        )}

        {set && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
              <div>
                <h1 className="font-display text-3xl font-semibold">{set.title}</h1>
                <p className="text-ink/60 text-sm mt-1">{set.cards.length} cards</p>
              </div>
              <button
                onClick={() => router.push(`/sets/${set.id}/review`)}
                className="px-6 py-3 rounded-full bg-coral text-paper font-medium shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all whitespace-nowrap inline-flex items-center gap-2"
              >
                <Play size={15} fill="currentColor" />
                Start review session
              </button>
            </div>

            <div className="space-y-3">
              {set.cards.map((card, i) => (
                <motion.div
                  key={card.id}
                  className="bg-white border-2 border-ink/10 rounded-2xl p-5"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: Math.min(i * 0.04, 0.4) }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-ink/40 mb-1">
                        Question
                      </p>
                      <p className="font-medium text-ink mb-3">{card.question}</p>
                      <p className="text-xs font-semibold uppercase tracking-wide text-ink/40 mb-1">
                        Answer
                      </p>
                      <p className="text-ink/70">{card.answer}</p>
                    </div>
                    <span
                      className={`shrink-0 text-xs font-medium px-3 py-1 rounded-full border-2 inline-flex items-center gap-1.5 ${STATUS_STYLES[card.status]}`}
                    >
                      {STATUS_ICON[card.status]}
                      {STATUS_LABEL[card.status]}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </main>
    </ProtectedRoute>
  );
}
