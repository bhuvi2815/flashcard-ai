"""
review_logic.py
----------------
WHAT THIS FILE DOES:
Implements the "Not Known cards appear more frequently" requirement
from the assignment, using a simple WEIGHTED RANDOM SELECTION approach
-- a lightweight version of the idea behind real spaced-repetition
systems like Anki's SM-2 algorithm.

HOW IT WORKS:
- Every card has a `weight` (starts at 3 when first created).
- Marking a card "Not Known" -> weight goes UP by 2 (capped at 10).
  -> this card is now more likely to be picked in future sessions.
- Marking a card "Known" -> weight goes DOWN by 1 (floor of 1).
  -> this card becomes less likely to show up, but never disappears
     completely (occasional revision is still healthy).

WHY WEIGHTED RANDOM (not just "sort by weight, show worst first")?
If we always strictly showed the lowest-known cards first, the SAME
1-2 hardest cards would dominate every single session, and the user
would never even see their "Known" cards again to confirm they still
remember them. Weighted randomness keeps things varied while still
strongly biasing towards weak cards -- closer to how real spaced
repetition tools behave.
"""

import random


def update_card_weight(card: dict, result: str) -> dict:
    """
    Called after the user reviews ONE card.
    Mutates and returns the card dict with updated weight/status.

    `result` is expected to be either "known" or "not_known".
    """
    card["times_reviewed"] = card.get("times_reviewed", 0) + 1

    if result == "known":
        card["status"] = "known"
        card["weight"] = max(1, card.get("weight", 3) - 1)
    elif result == "not_known":
        card["status"] = "not_known"
        card["weight"] = min(10, card.get("weight", 3) + 2)
    # If result is some unexpected string, we leave the card unchanged --
    # the route layer validates `result` before calling this function anyway.

    return card


def build_review_session(cards: list[dict], session_size: int = 10) -> list[dict]:
    """
    Picks which cards to show in THIS review session, using weighted
    random sampling -- cards with higher `weight` (i.e. "Not Known"
    cards) are proportionally more likely to be selected.

    Python's random.choices() does exactly this: given a list of items
    and a parallel list of weights, it picks items with probability
    proportional to their weight.

    If the set has fewer cards than `session_size`, we just return
    all of them (shuffled), since there's nothing more to sample from.
    """
    if len(cards) <= session_size:
        shuffled = cards.copy()
        random.shuffle(shuffled)
        return shuffled

    weights = [card.get("weight", 3) for card in cards]

    # random.choices() samples WITH replacement, which could show the
    # same card twice. For a review session we want each card to appear
    # only once, so we sample more than we need and de-duplicate by id.
    selected = []
    selected_ids = set()
    attempts = 0
    max_attempts = session_size * 10  # safety net against infinite loops

    while len(selected) < session_size and attempts < max_attempts:
        pick = random.choices(cards, weights=weights, k=1)[0]
        if pick["id"] not in selected_ids:
            selected.append(pick)
            selected_ids.add(pick["id"])
        attempts += 1

    return selected
