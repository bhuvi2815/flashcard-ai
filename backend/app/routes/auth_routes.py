"""
auth_routes.py
--------------
WHAT THIS FILE DOES:
Defines the two public-facing auth endpoints:
    POST /auth/signup
    POST /auth/login

JAVA ANALOGY:
This is the equivalent of an `AuthController` class in a Spring Boot
app, with @PostMapping("/signup") and @PostMapping("/login") methods.

NOTE: These are the ONLY two routes in the whole backend that do NOT
require a valid JWT token -- everything else needs login first.
"""

from fastapi import APIRouter, HTTPException, status
from app.models.user_model import UserSignup, UserLogin, UserOut
from app.database import users_collection
from app.utils.auth_utils import hash_password, verify_password, create_access_token

# An APIRouter groups related routes together. main.py will "include" this
# router under the prefix "/auth", so the full paths become /auth/signup etc.
router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/signup", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def signup(payload: UserSignup):
    """
    Registers a new user.

    FLOW:
      1. Check email isn't already taken.
      2. Hash the plain-text password (NEVER store it as-is).
      3. Insert the new user document into MongoDB.
      4. Return the safe, public-facing user info (no password).
    """
    existing_user = await users_collection.find_one({"email": payload.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists.",
        )

    new_user_doc = {
        "name": payload.name,
        "email": payload.email,
        "password_hash": hash_password(payload.password),
    }

    result = await users_collection.insert_one(new_user_doc)

    return UserOut(
        id=str(result.inserted_id),
        name=payload.name,
        email=payload.email,
    )


@router.post("/login")
async def login(payload: UserLogin):
    """
    Logs in an existing user.

    FLOW:
      1. Look up the user by email.
      2. Verify the submitted password against the stored bcrypt hash.
      3. If valid, issue a signed JWT the frontend will attach to all
         future requests (as "Authorization: Bearer <token>").

    We deliberately give the SAME error message for "email not found"
    and "wrong password" -- if we said "email not found" specifically,
    an attacker could use that to discover which emails are registered
    on the platform. This is a standard security practice.
    """
    auth_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Incorrect email or password.",
    )

    user = await users_collection.find_one({"email": payload.email})
    if not user:
        raise auth_error

    if not verify_password(payload.password, user["password_hash"]):
        raise auth_error

    token = create_access_token(user_id=str(user["_id"]))

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": str(user["_id"]),
            "name": user["name"],
            "email": user["email"],
        },
    }
