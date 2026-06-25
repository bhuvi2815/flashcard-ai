"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, X as XIcon, Check, RotateCcw, PartyPopper } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import Navbar from "@/components/Navbar";
import FlashcardFlip from "@/components/FlashcardFlip";
import { api } from "@/lib/api";
import { Flashcard } from "@/types";

// app/sets/[setId]/review/page.tsx
//
// THE CORE REVIEW LOOP:
//   1. On load, fetch a WEIGHTED session of cards from the backend
//      (GET /flashcards/{setId}/session) -- "Not Known" cards from
//      past sessions are more likely to appear here.
//   2. Show one card at a time using FlashcardFlip.
//   3. User taps "Known" or "Not Known" -> we POST that result to the
//      backend (which updates the card's weight server-side), then
//      advance to the next card in OUR local list.
//   4. When the local list is exhausted, show a completion screen.
//
// We keep `currentIndex` as local state and only ever move FORWARD
// through the session's card list -- the backend doesn't need to know
// "what session is in progress", it only needs each individual review
// result, which keeps the backend stateless and simple.

export default function ReviewPage() {
  const params = useParams();
  const router = useRouter();
  const setId = params.setId as string;

  const [title, setTitle] = useState("");
  const [cards, setCards] = useState<Flashcard[] | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<{ known: number; notKnown: number }>({
    known: 0,
    notKnown: 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api
      .get(`/flashcards/${setId}/session`)
      .then((res) => {
        setTitle(res.data.title);
        setCards(res.data.cards);
      })
      .catch(() => setNotFound(true));
  }, [setId]);

  async function handleResult(result: "known" | "not_known") {
    if (!cards || isSubmitting) return;
    const card = cards[currentIndex];
    setIsSubmitting(true);

    try {
      await api.post(`/flashcards/${setId}/review`, {
        card_id: card.id,
        result,
      });
      setResults((prev) => ({
        known: prev.known + (result === "known" ? 1 : 0),
        notKnown: prev.notKnown + (result === "not_known" ? 1 : 0),
      }));
      setCurrentIndex((i) => i + 1);
    } catch {
      toast.error("Couldn't save that. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const isComplete = cards !== null && currentIndex >= cards.length;

  return (
    <ProtectedRoute>
      <Navbar />
      <main className="max-w-2xl mx-auto px-5 py-10">
        <Link
          href={`/sets/${setId}`}
          className="text-sm text-ink/50 hover:text-ink mb-6 inline-flex items-center gap-1.5"
        >
          <ArrowLeft size={15} />
          Back to set
        </Link>

        {notFound && (
          <div className="text-center py-20">
            <p className="font-display text-xl font-semibold">Set not found</p>
          </div>
        )}

        {!notFound && cards === null && (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="animate-spin h-8 w-8 rounded-full border-4 border-coral border-t-transparent mb-4" />
            <p className="text-ink/50 text-sm">Preparing your review session...</p>
          </div>
        )}

        {cards !== null && !isComplete && (
          <>
            <div className="text-center mb-6">
              <h1 className="font-display text-2xl font-semibold">{title}</h1>
              <p className="text-sm text-ink/50 mt-1">
                Card {currentIndex + 1} of {cards.length}
              </p>
              <div className="h-1.5 w-full max-w-xs mx-auto bg-ink/10 rounded-full overflow-hidden mt-3">
                <motion.div
                  className="h-full bg-coral rounded-full"
                  animate={{ width: `${(currentIndex / cards.length) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={cards[currentIndex].id}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.2 }}
              >
                <FlashcardFlip card={cards[currentIndex]} />
              </motion.div>
            </AnimatePresence>

            <div className="flex items-center justify-center gap-4 mt-8">
              <button
                onClick={() => handleResult("not_known")}
                disabled={isSubmitting}
                className="px-6 py-3 rounded-full border-2 border-coral text-coral-dark font-medium hover:bg-coral-light transition-colors disabled:opacity-50 inline-flex items-center gap-2"
              >
                <XIcon size={16} />
                Not known
              </button>
              <button
                onClick={() => handleResult("known")}
                disabled={isSubmitting}
                className="px-6 py-3 rounded-full bg-mint text-paper font-medium shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all disabled:opacity-50 inline-flex items-center gap-2"
              >
                <Check size={16} />
                Known
              </button>
            </div>
          </>
        )}

        {isComplete && (
          <motion.div
            className="text-center py-16"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="w-16 h-16 rounded-full bg-sunshine-light border-2 border-sunshine flex items-center justify-center mx-auto mb-4 text-sunshine-dark">
              <PartyPopper size={28} />
            </div>
            <h2 className="font-display text-2xl font-semibold mb-2">Session complete!</h2>
            <p className="text-ink/60 mb-8">
              {results.known} known · {results.notKnown} not known
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => router.push(`/sets/${setId}`)}
                className="px-5 py-3 rounded-full border-2 border-ink/15 font-medium hover:border-ink/30 transition-colors"
              >
                Back to set
              </button>
              <button
                onClick={() => {
                  setCurrentIndex(0);
                  setResults({ known: 0, notKnown: 0 });
                  setCards(null);
                  api
                    .get(`/flashcards/${setId}/session`)
                    .then((res) => {
                      setTitle(res.data.title);
                      setCards(res.data.cards);
                    })
                    .catch(() => setNotFound(true));
                }}
                className="px-5 py-3 rounded-full bg-coral text-paper font-medium shadow-card hover:shadow-card-hover transition-all inline-flex items-center gap-2"
              >
                <RotateCcw size={15} />
                Review again
              </button>
            </div>
          </motion.div>
        )}
      </main>
    </ProtectedRoute>
  );
}
