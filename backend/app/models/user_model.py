"""
user_model.py
-------------
WHAT THIS FILE DOES:
Defines the SHAPE of a "user" -- what fields exist, what type each
field must be, and which fields are required vs optional.

JAVA ANALOGY:
This is like a Java POJO / DTO class (e.g. `UserDTO`), but FastAPI's
underlying library `pydantic` ALSO automatically:
  - validates incoming JSON against this shape (rejects bad requests
    with a clear 422 error, similar to @Valid + @NotNull in Spring)
  - converts between JSON <-> Python object <-> MongoDB document

We define THREE versions of "user" because we don't want to expose
the same fields in every situation (e.g. NEVER send password_hash
back to the frontend):
  1. UserSignup   -> what the client SENDS when registering
  2. UserLogin    -> what the client SENDS when logging in
  3. UserOut      -> what the server SENDS BACK (safe, no password)
"""

from pydantic import BaseModel, EmailStr, Field


class UserSignup(BaseModel):
    """Incoming data when a new user registers."""
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr  # pydantic validates this is a real email format
    password: str = Field(..., min_length=6, max_length=128)
    # min_length=6 is a basic safety net -- frontend should also validate this.


class UserLogin(BaseModel):
    """Incoming data when an existing user logs in."""
    email: EmailStr
    password: str


class UserOut(BaseModel):
    """
    Data we are SAFE to send back to the frontend about a user.
    Notice: NO password field here at all. This is intentional --
    it's a security guardrail baked into the data shape itself,
    not something we have to "remember" to strip out every time.
    """
    id: str
    name: str
    email: EmailStr
