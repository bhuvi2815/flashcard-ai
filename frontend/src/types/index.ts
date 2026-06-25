// types/index.ts
//
// These types mirror the Pydantic models on the backend
// (see backend/app/models/*.py). Keeping them in sync means
// TypeScript will catch mismatches (e.g. typo'd field names)
// at compile time instead of as a runtime bug in the browser.

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Flashcard {
  id: string;
  question: string;
  answer: string;
  status: "unseen" | "known" | "not_known";
  weight: number;
  times_reviewed: number;
}

export interface FlashcardSetSummary {
  id: string;
  title: string;
  total_cards: number;
  known_cards: number;
  created_at: string;
}

export interface FlashcardSet {
  id: string;
  user_id: string;
  title: string;
  original_notes: string;
  cards: Flashcard[];
  created_at: string;
}

export interface ReviewSession {
  set_id: string;
  title: string;
  cards: Flashcard[];
}
