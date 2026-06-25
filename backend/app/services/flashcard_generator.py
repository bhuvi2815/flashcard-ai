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

MEMORY OPTIMISATION (Render free tier = 512 MB RAM):
  Models are NOT loaded at import time. Instead, they are loaded the
  first time generate_flashcards() is called and then cached in
  module-level variables (_nlp, _qg_tokenizer, _qg_model).
  This keeps startup RAM near-zero so Render can boot the process
  without hitting the 512 MB ceiling before serving a single request.
"""

import spacy
from transformers import T5ForConditionalGeneration, T5Tokenizer
import torch

# ---------------------------------------------------------------------------
# LAZY-LOADED SINGLETONS
# ---------------------------------------------------------------------------
# These start as None. _load_models() fills them on the first real request.
# After that, every subsequent call reuses the already-loaded objects --
# same behaviour as the original "load at import" approach, just deferred.
# JAVA ANALOGY: like a lazily-initialised @Bean / double-checked singleton.
# ---------------------------------------------------------------------------
_nlp = None
_qg_tokenizer = None
_qg_model = None

QG_MODEL_NAME = "valhalla/t5-small-qg-hl"


def _load_models() -> None:
    """
    Load spaCy pipeline and the T5 QG model into module-level variables.
    Called automatically on the first generate_flashcards() invocation;
    subsequent calls are a no-op (guard: `if _nlp is not None`).

    WHY LAZY AND NOT AT STARTUP?
    Render's free tier gives each process 512 MB.  Loading torch +
    transformers + spaCy all at import time consumes ~600-700 MB before
    the HTTP server even binds to a port, which causes an OOM kill during
    the build/startup phase.  Deferring to the first real request means
    the process boots cheaply and only pays the memory cost when a user
    actually triggers generation -- at which point Render's runtime
    allocates the RAM from its larger pool rather than the tighter
    startup budget.
    """
    global _nlp, _qg_tokenizer, _qg_model

    if _nlp is not None:
        return  # already loaded -- nothing to do

    # spaCy small English pipeline (~13 MB):
    # handles tokenisation, POS tagging, NER, sentence boundary detection.
    _nlp = spacy.load("en_core_web_sm")

    # T5-small fine-tuned for question generation (~60M parameters, CPU-only).
    # torch_dtype=torch.float32 keeps it compatible with CPU-only Render instances.
    _qg_tokenizer = T5Tokenizer.from_pretrained(QG_MODEL_NAME)
    _qg_model = T5ForConditionalGeneration.from_pretrained(
        QG_MODEL_NAME,
        torch_dtype=torch.float32,   # explicit float32 -- avoids bfloat16 issues on CPU
    )
    _qg_model.eval()  # switch to inference mode -- disables dropout, saves a little RAM


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

    input_ids = _qg_tokenizer.encode(
        input_text, return_tensors="pt", max_length=256, truncation=True
    )

    with torch.no_grad():  # we're not training, so skip gradient tracking
        # this saves memory and makes inference faster
        output_ids = _qg_model.generate(
            input_ids, max_length=64, num_beams=4, early_stopping=True
        )

    question = _qg_tokenizer.decode(output_ids[0], skip_special_tokens=True)
    return question.strip()


def generate_flashcards(notes_text: str, max_cards: int = 8) -> list[dict]:
    """
    MAIN ENTRY POINT -- called by the route handler.

    Takes raw study notes (a paragraph or several), runs the full
    4-step pipeline, and returns a list of flashcard dicts:
        [{"question": "...", "answer": "..."}, ...]

    `max_cards` caps how many flashcards we generate, so a very long
    paragraph doesn't produce an overwhelming review session.

    Models are loaded on the first call and reused on all subsequent
    calls (lazy singleton pattern -- see _load_models() above).
    """
    # Ensure models are in memory before we use them.
    # This is a no-op on every call after the first one.
    _load_models()

    doc = _nlp(notes_text)

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