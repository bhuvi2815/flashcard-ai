"use client";

import { useState, FormEvent } from "react";
import toast from "react-hot-toast";
import axios from "axios";
import { motion } from "framer-motion";
import { X, Sparkles, Wand2 } from "lucide-react";
import { api } from "@/lib/api";
import { FlashcardSet } from "@/types";

// components/NewSetModal.tsx
//
// The core "input" interaction of the whole app: user pastes notes,
// gives the set a title, and we call POST /flashcards/generate.
// This request can take a few seconds (the AI pipeline runs server-side:
// spaCy parsing + a T5 model generating questions) so we show a clear
// "thinking" state rather than a frozen button.

// A real, detailed study paragraph -- lets someone try the full pipeline
// in one click without having to write their own notes first. Chosen to
// be content-dense (multiple named entities, concrete facts) since that's
// exactly what the extractive-ranking step in flashcard_generator.py looks for.
const SAMPLE_NOTES = {
  title: "Cell Biology — Mitochondria",
  notes:
    "Mitochondria are membrane-bound organelles found in most eukaryotic cells. " +
    "They are often called the powerhouse of the cell because they generate most " +
    "of the cell's supply of adenosine triphosphate, or ATP, through a process " +
    "called cellular respiration. Mitochondria have their own circular DNA, " +
    "separate from the cell's nuclear DNA, which supports the theory that they " +
    "originated from ancient free-living bacteria that were engulfed by early " +
    "eukaryotic cells. This theory is known as endosymbiosis. The number of " +
    "mitochondria in a cell varies widely depending on the cell's energy needs; " +
    "muscle cells and liver cells, which require large amounts of energy, " +
    "contain thousands of mitochondria each.",
};

export default function NewSetModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (set: FlashcardSet) => void;
}) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  function fillSample() {
    setTitle(SAMPLE_NOTES.title);
    setNotes(SAMPLE_NOTES.notes);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsGenerating(true);
    try {
      const response = await api.post("/flashcards/generate", {
        title,
        notes_text: notes,
      });
      toast.success("Flashcards generated!");
      onCreated(response.data);
    } catch (err) {
      const message =
        axios.isAxiosError(err) && err.response?.data?.detail
          ? err.response.data.detail
          : "Couldn't generate flashcards. Please try again.";
      toast.error(message);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-ink/40 backdrop-blur-sm">
      <motion.div
        className="w-full max-w-lg bg-paper rounded-2xl border-2 border-ink/10 shadow-pop p-6 max-h-[90vh] overflow-y-auto"
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.2 }}
      >
        <div className="flex items-start justify-between mb-1">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-grape-light border-2 border-grape flex items-center justify-center text-grape-dark shrink-0">
              <Sparkles size={17} />
            </span>
            <div>
              <h2 className="font-display text-xl font-semibold">New flashcard set</h2>
              <p className="text-sm text-ink/60 mt-0.5">Paste your notes, we&apos;ll do the rest.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isGenerating}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-ink/5 text-ink/50 disabled:opacity-40 shrink-0"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Quick-start: fills in a real, detailed paragraph so the AI
            pipeline can be tried immediately without writing notes first */}
        <button
          type="button"
          onClick={fillSample}
          disabled={isGenerating}
          className="mt-4 mb-2 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-ink/15 text-sm font-medium text-ink/60 hover:border-grape hover:text-grape-dark hover:bg-grape-light/40 transition-colors disabled:opacity-50"
        >
          <Wand2 size={15} />
          Try a sample paragraph
        </button>

        <form onSubmit={handleSubmit} className="space-y-4 mt-3">
          <label className="block">
            <span className="block text-sm font-medium text-ink/80 mb-1.5">Set title</span>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Cell Biology - Chapter 3"
              disabled={isGenerating}
              className="w-full px-4 py-2.5 rounded-xl border-2 border-ink/12 bg-white text-sm focus:outline-none focus:border-coral disabled:opacity-60"
            />
          </label>

          <label className="block">
            <span className="block text-sm font-medium text-ink/80 mb-1.5">Study notes</span>
            <textarea
              required
              minLength={20}
              rows={8}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Paste a paragraph of notes on any topic — biology, history, programming, anything..."
              disabled={isGenerating}
              className="w-full px-4 py-2.5 rounded-xl border-2 border-ink/12 bg-white text-sm leading-relaxed focus:outline-none focus:border-coral disabled:opacity-60 resize-none"
            />
            <span className="block text-xs text-ink/40 mt-1">
              {notes.length} characters — more detail usually makes better flashcards.
            </span>
          </label>

          <button
            type="submit"
            disabled={isGenerating}
            className="w-full py-3 rounded-full bg-coral text-paper font-medium shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:hover:translate-y-0 flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-paper/40 border-t-paper animate-spin" />
                Reading your notes...
              </>
            ) : (
              "Generate flashcards"
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
