"""
flashcard_generator.py
-----------------------
WHAT THIS FILE DOES:
This is the CORE AI/ML LOGIC of the whole assignment -- the part that
turns a raw paragraph of study notes into a list of question/answer
flashcards, using REAL NLP processing (not just splitting sentences
or hardcoded string rules).

THE PIPELINE -- 4 STEPS:

  Step 1: SENTENCE SEGMENTATION (spaCy)
          Break the paragraph into individual sentences properly --
          spaCy understands abbreviations, decimals, etc. so it won't
          incorrectly split on "Dr." or "3.14" like a naive split(".") would.

  Step 2: SENTENCE RANKING / IMPORTANCE SCORING (spaCy + keyword frequency)
          Not every sentence makes a good flashcard. We score each
          sentence based on how many "important" words (nouns, proper
          nouns, named entities) it contains, then pick the TOP
          sentences. This is a real extractive-summarization technique
          (similar in spirit to TextRank), not arbitrary selection.

  Step 3: KEYWORD/ANSWER EXTRACTION (spaCy Named Entity + Noun Chunks)
          For each top-ranked sentence, we identify the most important
          phrase in it (a named entity if one exists, otherwise the
          longest noun chunk). THIS becomes the "answer".

  Step 4: QUESTION GENERATION (Hugging Face Transformers, t5-small based)
          We feed the sentence + the chosen answer phrase into a
          small T5 model fine-tuned for question generation. The
          model outputs a natural question whose answer IS that phrase.
          This is genuine sequence-to-sequence ML inference --
          satisfies the assignment's requirement of "a summarization
          model" / "question generation" / real text processing.

WHY THIS DESIGN (and not just "ask an LLM to make flashcards")?
The assignment EXPLICITLY forbids paid/external AI APIs (OpenAI, Gemini,
Claude API). Everything here runs locally using open-source models
small enough to fit on a free-tier server (no GPU required).
"""

import spacy
from transformers import T5ForConditionalGeneration, T5Tokenizer
import torch

# ---------------------------------------------------------------------------
# MODEL LOADING -- happens ONCE when the server starts, not per-request.
# Loading a model is slow (seconds) and memory-heavy; doing it on every
# request would make the API painfully slow and wasteful.
# JAVA ANALOGY: this is like a `@PostConstruct`-initialized singleton bean.
# ---------------------------------------------------------------------------

# spaCy's small English pipeline -- handles tokenization, POS tagging,
# named entity recognition (NER), and sentence boundary detection.
# "en_core_web_sm" is ~13MB, fast, no GPU needed -- good fit for free hosting.
nlp = spacy.load("en_core_web_sm")

# A T5 model fine-tuned specifically for question generation.
# Given input formatted as "generate question: <answer> context: <sentence>",
# it outputs a natural-language question. ~60M parameters, runs fine on CPU.
QG_MODEL_NAME = "valhalla/t5-small-qg-hl"
qg_tokenizer = T5Tokenizer.from_pretrained(QG_MODEL_NAME)
qg_model = T5ForConditionalGeneration.from_pretrained(QG_MODEL_NAME)


def _score_sentences(doc) -> list[tuple]:
    """
    STEP 2: Ranks sentences by an "importance score".

    HOW THE SCORE IS CALCULATED:
    For each sentence, we count how many tokens in it are:
      - a noun, proper noun, or part of a named entity
    More such tokens (relative to sentence length) suggests the
    sentence carries concrete, factual content -- a good candidate
    for a flashcard -- rather than being a filler/transition sentence
    ("However, this is also true in many cases.") which has few nouns.

    Returns a list of (sentence, score) tuples, NOT yet sorted.
    """
    scored = []
    for sent in doc.sents:
        if len(sent.text.split()) < 5:
            # Skip sentences that are too short to contain a real fact
            # (e.g. "This is true." has nothing extractable).
            continue

        important_tokens = 0
        for token in sent:
            if token.pos_ in ("NOUN", "PROPN") or token.ent_type_ != "":
                important_tokens += 1

        # Normalize by sentence length so we don't just favor long sentences.
        score = important_tokens / len(sent)
        scored.append((sent, score))

    return scored


def _extract_answer_phrase(sent) -> str | None:
    """
    STEP 3: Picks the best "answer" phrase from a single sentence.

    PRIORITY ORDER:
      1. Prefer a named entity (e.g. "Mitochondria", "1945", "Newton")
         -- these make the most natural flashcard answers.
      2. Fall back to the longest noun chunk (e.g. "the powerhouse of
         the cell") if no named entity exists in the sentence.

    Returns None if neither is found (sentence gets skipped).
    """
    if len(sent.ents) > 0:
        # Pick the longest entity span -- usually the most specific/useful one.
        best_entity = max(sent.ents, key=lambda ent: len(ent.text))
        return best_entity.text

    noun_chunks = list(sent.noun_chunks)
    if noun_chunks:
        best_chunk = max(noun_chunks, key=lambda chunk: len(chunk.text))
        return best_chunk.text

    return None


def _generate_question(sentence_text: str, answer_phrase: str) -> str:
    """
    STEP 4: Runs the T5 question-generation model.

    INPUT FORMAT this specific model expects:
        "generate question: <hl> <answer_phrase> <hl> <full_sentence>"
    The <hl> ("highlight") tokens tell the model WHICH part of the
    sentence is the answer it should be asking about.
    """
    # Wrap the answer phrase in highlight tokens within the sentence,
    # so the model knows exactly what we want the question to target.
    highlighted = sentence_text.replace(
        answer_phrase, f"<hl> {answer_phrase} <hl>", 1
    )
    input_text = f"generate question: {highlighted}"

    input_ids = qg_tokenizer.encode(
        input_text, return_tensors="pt", max_length=256, truncation=True
    )

    with torch.no_grad():  # we're not training, so skip gradient tracking
        # this saves memory and makes inference faster
        output_ids = qg_model.generate(
            input_ids, max_length=64, num_beams=4, early_stopping=True
        )

    question = qg_tokenizer.decode(output_ids[0], skip_special_tokens=True)
    return question.strip()


def generate_flashcards(notes_text: str, max_cards: int = 8) -> list[dict]:
    """
    MAIN ENTRY POINT -- called by the route handler.

    Takes raw study notes (a paragraph or several), runs the full
    4-step pipeline, and returns a list of flashcard dicts:
        [{"question": "...", "answer": "..."}, ...]

    `max_cards` caps how many flashcards we generate, so a very long
    paragraph doesn't produce an overwhelming review session.
    """
    doc = nlp(notes_text)

    # Step 2: score and rank all sentences
    scored_sentences = _score_sentences(doc)
    scored_sentences.sort(key=lambda pair: pair[1], reverse=True)

    flashcards = []
    seen_answers = set()  # avoid generating near-duplicate cards

    for sent, score in scored_sentences:
        if len(flashcards) >= max_cards:
            break

        # Step 3: extract the answer phrase for this sentence
        answer_phrase = _extract_answer_phrase(sent)
        if not answer_phrase:
            continue

        # Skip if we've already made a card with a very similar answer
        normalized = answer_phrase.lower().strip()
        if normalized in seen_answers:
            continue
        seen_answers.add(normalized)

        # Step 4: generate the actual question text
        question = _generate_question(sent.text, answer_phrase)

        flashcards.append({
            "question": question,
            "answer": answer_phrase,
        })

    return flashcards
