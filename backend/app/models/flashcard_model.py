"""
flashcard_model.py
-------------------
WHAT THIS FILE DOES:
Defines the SHAPE of a "flashcard" and a "flashcard set" (a collection
of flashcards generated from one paragraph of notes).

DESIGN DECISION -- why we store cards INSIDE the set document
(instead of a separate "cards" collection with a foreign key):
MongoDB favors embedding data that is always accessed TOGETHER.
We always fetch "all cards in this set" together, we never need
"just one card" independently. So one document per set, with an
array of cards inside it, means ONE database read per review session
instead of N reads. This is the kind of design choice you should be
ready to explain in your interview.

SPACED-REPETITION FIELD -- `weight`:
Each card has a `weight` (think of it as "how often should this card
show up?"). Starts at 1. Every time the user marks a card "Not Known",
we INCREASE its weight. Every time they mark it "Known", we DECREASE
it (but never below 1). When building a review session, cards with
higher weight are more likely to be picked -- this is what satisfies
the assignment's "Not Known cards appear more frequently" requirement.
"""

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class Flashcard(BaseModel):
    """A single question/answer flashcard."""
    id: str                      # unique id within the set (e.g. "card_1")
    question: str
    answer: str

    # Spaced-repetition bookkeeping fields:
    status: str = "unseen"       # one of: "unseen", "known", "not_known"
    weight: int = 3              # higher weight = shown more often
    times_reviewed: int = 0


class FlashcardSetCreate(BaseModel):
    """What the frontend sends us when generating a new set."""
    title: str = Field(..., min_length=1, max_length=150)
    notes_text: str = Field(..., min_length=20)
    # min_length=20 -- a single short sentence can't realistically
    # produce meaningful flashcards, so we reject obviously-too-short input
    # early instead of wasting time running the AI pipeline on it.


class FlashcardSetOut(BaseModel):
    """What we send back to the frontend -- a full set with its cards."""
    id: str
    user_id: str
    title: str
    original_notes: str
    cards: List[Flashcard]
    created_at: datetime


class ReviewUpdate(BaseModel):
    """What the frontend sends when the user reviews ONE card."""
    card_id: str
    result: str  # expected to be "known" or "not_known"
