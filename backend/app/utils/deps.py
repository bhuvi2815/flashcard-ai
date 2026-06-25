"""
deps.py
-------
WHAT THIS FILE DOES:
Defines `get_current_user` -- a special FastAPI "dependency" function
that:
  1. Pulls the JWT token out of the incoming request's Authorization header
  2. Verifies it (using decode_access_token from auth_utils.py)
  3. Fetches the matching user from MongoDB
  4. Hands that user object to whichever route asked for it

JAVA ANALOGY:
This plays the same role as a Spring Security `@PreAuthorize` filter /
JWT authentication filter chain -- it runs BEFORE your actual route
logic, and blocks the request early (with 401 Unauthorized) if the
token is missing or invalid, so your route code can just assume
"if I'm running, the user is definitely logged in."

HOW IT'S USED:
In any protected route, instead of:
    async def my_route():
you write:
    async def my_route(current_user: dict = Depends(get_current_user)):
and FastAPI automatically runs this function first, injecting the
result as `current_user`.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from bson import ObjectId

from app.utils.auth_utils import decode_access_token
from app.database import users_collection

# This tells FastAPI: "expect a Bearer token in the Authorization header,
# and the (dummy) login URL for documentation purposes is /auth/login".
# FastAPI uses this to auto-generate the "Authorize" button in the
# interactive /docs page.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    """
    Runs automatically on every route that declares it as a dependency.
    Raises 401 if the token is missing, invalid, expired, or the user
    no longer exists in the database.
    """
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials. Please log in again.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    user_id = decode_access_token(token)
    if user_id is None:
        raise credentials_error

    # ObjectId() converts the string id back into MongoDB's native id type.
    # If user_id is somehow not a valid ObjectId format, this throws --
    # we catch that case too, since it also means "invalid token".
    try:
        user = await users_collection.find_one({"_id": ObjectId(user_id)})
    except Exception:
        raise credentials_error

    if user is None:
        raise credentials_error

    return user
