"""
flashcard_routes.py
--------------------
WHAT THIS FILE DOES:
Defines all the flashcard-related endpoints, ALL of which require the
user to be logged in (notice every route below has
`current_user: dict = Depends(get_current_user)` as a parameter):

    POST /flashcards/generate        -> create a new set from notes (runs AI pipeline)
    GET  /flashcards/                -> list all of the user's sets (for dashboard)
    GET  /flashcards/{set_id}        -> get one full set (for the review page)
    GET  /flashcards/{set_id}/session -> get a weighted review session for one set
    POST /flashcards/{set_id}/review -> submit a Known/Not Known result for one card
"""

from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId
from datetime import datetime, timezone
import uuid

from app.models.flashcard_model import FlashcardSetCreate, ReviewUpdate
from app.utils.deps import get_current_user
from app.database import flashcard_sets_collection
from app.services.flashcard_generator import generate_flashcards
from app.services.review_logic import update_card_weight, build_review_session

router = APIRouter(prefix="/flashcards", tags=["Flashcards"])


def _serialize_set(doc: dict) -> dict:
    """
    Small helper: MongoDB's `_id` is an ObjectId, which isn't valid JSON.
    This converts it to a plain string before sending the document back
    in any API response. Used by several routes below, hence the helper.
    """
    doc["id"] = str(doc["_id"])
    doc.pop("_id")
    return doc


@router.post("/generate", status_code=status.HTTP_201_CREATED)
async def generate_flashcard_set(
    payload: FlashcardSetCreate,
    current_user: dict = Depends(get_current_user),
):
    """
    THE CORE FEATURE OF THIS ENTIRE APP.

    FLOW:
      1. Take the raw notes text the user pasted.
      2. Run it through the NLP pipeline (generate_flashcards) to get
         a list of {question, answer} pairs.
      3. Wrap each pair as a full Flashcard (with id, weight, status).
      4. Save the whole set as ONE MongoDB document, linked to this user.
    """
    raw_cards = generate_flashcards(payload.notes_text)

    if not raw_cards:
        # This can genuinely happen with very short or low-content text
        # (e.g. notes_text = "asdf asdf asdf"). We tell the user clearly
        # instead of silently saving an empty, useless set.
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "Could not extract enough meaningful content from these "
                "notes to generate flashcards. Try pasting a more detailed "
                "paragraph."
            ),
        )

    # Turn each raw {question, answer} dict into a full card object,
    # adding the spaced-repetition bookkeeping fields.
    cards = []
    for raw in raw_cards:
        cards.append({
            "id": str(uuid.uuid4())[:8],  # short unique id, unique enough within one set
            "question": raw["question"],
            "answer": raw["answer"],
            "status": "unseen",
            "weight": 3,
            "times_reviewed": 0,
        })

    new_set_doc = {
        "user_id": str(current_user["_id"]),
        "title": payload.title,
        "original_notes": payload.notes_text,
        "cards": cards,
        "created_at": datetime.now(timezone.utc),
    }

    result = await flashcard_sets_collection.insert_one(new_set_doc)
    new_set_doc["_id"] = result.inserted_id

    return _serialize_set(new_set_doc)


@router.get("/")
async def list_flashcard_sets(current_user: dict = Depends(get_current_user)):
    """
    Returns a LIGHTWEIGHT list of all flashcard sets belonging to the
    logged-in user -- used for the dashboard page. We deliberately
    don't send the full `cards` array here (could be large across many
    sets); the dashboard just needs titles + basic stats per set.
    """
    cursor = flashcard_sets_collection.find({"user_id": str(current_user["_id"])})

    sets_summary = []
    async for doc in cursor:
        total_cards = len(doc.get("cards", []))
        known_cards = sum(1 for c in doc.get("cards", []) if c.get("status") == "known")

        sets_summary.append({
            "id": str(doc["_id"]),
            "title": doc["title"],
            "total_cards": total_cards,
            "known_cards": known_cards,
            "created_at": doc["created_at"],
        })

    # Most recently created sets first -- more useful on a dashboard.
    sets_summary.sort(key=lambda s: s["created_at"], reverse=True)
    return sets_summary


@router.get("/{set_id}")
async def get_flashcard_set(set_id: str, current_user: dict = Depends(get_current_user)):
    """
    Fetches ONE full flashcard set (all its cards) -- used when the
    user opens a set to review it.

    SECURITY NOTE: we filter by BOTH _id AND user_id in the query.
    This prevents User A from guessing/reusing User B's set_id and
    viewing User B's private flashcards -- a classic "broken object
    level authorization" (BOLA) vulnerability if we only filtered by _id.
    """
    doc = await flashcard_sets_collection.find_one({
        "_id": ObjectId(set_id),
        "user_id": str(current_user["_id"]),
    })

    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Flashcard set not found.",
        )

    return _serialize_set(doc)


@router.get("/{set_id}/session")
async def get_review_session(set_id: str, current_user: dict = Depends(get_current_user)):
    """
    Returns a WEIGHTED subset of cards from this set for one review
    session -- this is where the "Not Known cards appear more often"
    requirement actually gets applied (see review_logic.py).
    """
    doc = await flashcard_sets_collection.find_one({
        "_id": ObjectId(set_id),
        "user_id": str(current_user["_id"]),
    })

    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Flashcard set not found.",
        )

    session_cards = build_review_session(doc["cards"])
    return {"set_id": set_id, "title": doc["title"], "cards": session_cards}


@router.post("/{set_id}/review")
async def submit_review(
    set_id: str,
    payload: ReviewUpdate,
    current_user: dict = Depends(get_current_user),
):
    """
    Called once per card, every time the user taps "Known" or "Not Known"
    during a review session. Updates that ONE card's weight/status
    inside the set's `cards` array.

    IMPLEMENTATION NOTE:
    We fetch the whole document, modify the matching card IN PYTHON,
    then write the whole `cards` array back. For a small embedded
    array like this (a handful to a few dozen cards), this is simpler
    and perfectly performant. (An alternative for very large arrays
    would be MongoDB's "$" positional update operator to patch just
    one array element directly in the database -- worth mentioning if
    asked about scaling this further.)
    """
    if payload.result not in ("known", "not_known"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="result must be 'known' or 'not_known'.",
        )

    doc = await flashcard_sets_collection.find_one({
        "_id": ObjectId(set_id),
        "user_id": str(current_user["_id"]),
    })
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Flashcard set not found.",
        )

    card_found = False
    for card in doc["cards"]:
        if card["id"] == payload.card_id:
            update_card_weight(card, payload.result)
            card_found = True
            break

    if not card_found:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Card not found in this set.",
        )

    await flashcard_sets_collection.update_one(
        {"_id": ObjectId(set_id)},
        {"$set": {"cards": doc["cards"]}},
    )

    return {"message": "Review recorded.", "card_id": payload.card_id, "result": payload.result}
