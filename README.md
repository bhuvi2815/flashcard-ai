# Recall — Smart Flashcard Generator

**Option chosen:** Option A — Smart Flashcard Generator

Turns a pasted paragraph of study notes into question/answer flashcards
using real NLP processing, then helps you review the cards you struggle
with more often using a lightweight spaced-repetition approach.

---

## Tech stack

| Layer        | Choice                                                   |
|--------------|-----------------------------------------------------------|
| Frontend     | Next.js 14 (App Router) + TypeScript + Tailwind CSS       |
| Backend      | FastAPI (Python)                                           |
| Database     | MongoDB Atlas (free tier), accessed via Motor (async)      |
| Auth         | Email + password, bcrypt hashing, JWT sessions             |
| AI / NLP     | spaCy (`en_core_web_sm`) + Hugging Face Transformers (`valhalla/t5-small-qg-hl`) |
| Deployment   | Frontend → Vercel · Backend → Render · DB → MongoDB Atlas  |

**Why FastAPI instead of Node.js:** the AI/ML pipeline (spaCy + a
Transformers model) is Python-native. Keeping auth, database access,
and the AI logic in one Python codebase avoids splitting the app into
a Node API + a separate Python microservice just to run the NLP part.

**Why MongoDB instead of a SQL database:** a flashcard set is naturally
a document — one title, one block of original notes, and an array of
cards. We always read/write a whole set at once (never one card in
isolation), so embedding cards inside the set document means one
database round-trip per operation instead of joining across tables.

---

## How the AI/ML part works

The core logic lives in `backend/app/services/flashcard_generator.py`.
Given a paragraph of notes, it runs a 4-step pipeline:

1. **Sentence segmentation (spaCy)** — splits the paragraph into proper
   sentences (handles abbreviations/decimals correctly, unlike a naive
   `.split(".")`).

2. **Sentence ranking** — scores every sentence by the proportion of
   "important" tokens it contains (nouns, proper nouns, named entities).
   Sentences that are mostly filler/transition words score low; sentences
   packed with concrete facts score high. The top-scoring sentences become
   flashcard candidates — this is the same idea behind extractive
   summarization techniques like TextRank, just implemented directly with
   spaCy's POS tagging and NER output instead of building a sentence graph.

3. **Answer extraction** — for each chosen sentence, spaCy's named entity
   recognizer picks out the most specific entity in it (a name, date,
   number, organism, etc.) to use as the flashcard's answer. If no named
   entity exists, we fall back to the longest noun phrase in the sentence.

4. **Question generation (Hugging Face Transformers)** — the sentence and
   its extracted answer are fed into `valhalla/t5-small-qg-hl`, a small
   (~60M parameter) T5 model fine-tuned specifically for question
   generation. It outputs a natural-language question whose answer is the
   highlighted phrase. This step is genuine sequence-to-sequence model
   inference, not a template or hardcoded rule.

This satisfies the assignment's requirement of real NLP/ML processing
(not sentence-splitting) while staying entirely local and free — no
OpenAI/Gemini/Claude API calls anywhere in the pipeline.

**Spaced-repetition review logic** (`backend/app/services/review_logic.py`):
each card has a `weight`, starting at 3. Marking a card "Not Known" raises
its weight (capped at 10); marking it "Known" lowers it (floored at 1).
When building a review session, cards are picked using weighted random
sampling — higher-weight cards are statistically more likely to be shown,
without ever fully excluding cards you already know.

---

## Running it locally

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm

cp .env.example .env
# Edit .env: paste your MongoDB Atlas connection string and a JWT secret

uvicorn app.main:app --reload --port 8000
```

Backend will run at `http://localhost:8000`. Interactive API docs are
available at `http://localhost:8000/docs`.

### Frontend

```bash
cd frontend
npm install

cp .env.local.example .env.local
# Defaults to http://localhost:8000 for local dev — fine as-is

npm run dev
```

Frontend will run at `http://localhost:3000`.

---

## Project structure

```
flashcard-ai/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI app entry point
│   │   ├── config.py                # env var loading
│   │   ├── database.py              # MongoDB connection
│   │   ├── models/                  # Pydantic request/response shapes
│   │   ├── routes/                  # auth + flashcard endpoints
│   │   ├── services/
│   │   │   ├── flashcard_generator.py  # the AI/ML pipeline
│   │   │   └── review_logic.py         # spaced-repetition weighting
│   │   └── utils/                   # password hashing, JWT, auth dependency
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    └── src/
        ├── app/                     # Next.js pages (App Router)
        ├── components/              # FlashcardFlip, SetCard, Navbar, etc.
        ├── context/AuthContext.tsx  # global login state
        ├── lib/api.ts               # axios client + token handling
        └── types/                  # shared TypeScript types
```

---

## Deployment notes

- **Backend (Render):** create a new Web Service, set the build command
  to `pip install -r requirements.txt && python -m spacy download en_core_web_sm`,
  and the start command to `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
  Add the same environment variables from `.env.example` in Render's
  dashboard, with `FRONTEND_ORIGIN` set to your deployed Vercel URL.

- **Frontend (Vercel):** import the `frontend` folder as a project, set
  `NEXT_PUBLIC_API_URL` to your deployed Render backend URL.

- **Database (MongoDB Atlas):** create a free M0 cluster, add a database
  user, and whitelist `0.0.0.0/0` in Network Access (required since
  Render's IP isn't static on the free tier).

- Render's free tier spins down after inactivity — the first request
  after a period of idling may take 30-60 seconds while it wakes up.
  The root `/` route is a lightweight health check you can ping to wake
  it.

---

## A note on dependency versions

`package-lock.json` pins Next.js to `14.2.32`, the latest patched
release in the 14.x line, to avoid a known security advisory present in
earlier 14.2.x builds. A handful of `npm audit` warnings remain from
transitive **dev-only** tooling (ESLint's dependency tree) — these don't
ship in the production build and don't affect the deployed app.
