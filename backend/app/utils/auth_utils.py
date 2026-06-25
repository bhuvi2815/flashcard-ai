"""
auth_utils.py
-------------
WHAT THIS FILE DOES:
Two separate jobs live here:
  1. PASSWORD HASHING -- turning "mypassword123" into an irreversible
     scrambled string before saving it to the database.
  2. JWT TOKENS -- creating and verifying the "login session" token
     that proves a user is logged in, without the server needing to
     store session state anywhere.

JAVA ANALOGY:
This is the equivalent of Spring Security's `PasswordEncoder`
(BCryptPasswordEncoder) + a custom `JwtUtil` class you'd often
hand-write in a Spring Boot project.

WHY HASH PASSWORDS AT ALL?
If our database ever leaks (gets hacked, backup exposed, etc.),
plain-text passwords would instantly compromise every user's account
on THIS app and potentially other apps (people reuse passwords).
Hashing means even WE (the developers) cannot see the original
password -- we can only check "does this guess match the hash?".

WHY BCRYPT SPECIFICALLY?
Unlike a fast hash (e.g. plain SHA-256), bcrypt is DELIBERATELY slow
and includes a random "salt" automatically. This makes brute-force
password-guessing attacks impractically slow, and means two users
with the SAME password get DIFFERENT hashes in the database.

WHY JWT FOR LOGIN SESSIONS?
Without JWT, the server would need to store "user X is logged in"
in some session table/memory (stateful). JWT instead packs the
user's identity into a signed token that the CLIENT holds onto and
sends back with every request. The server just verifies the
signature -- no session storage needed. This is what makes JWT-based
auth "stateless" and easy to scale.
"""

from passlib.context import CryptContext
from jose import jwt, JWTError
from datetime import datetime, timedelta, timezone
from app.config import settings

# ---- Password hashing setup ----
# CryptContext is passlib's way of saying "use bcrypt as the hashing scheme".
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain_password: str) -> str:

     """Hash a password using bcrypt. Passwords longer than 72 bytes are
    truncated (bcrypt limitation)."""
    # Truncate to 72 bytes (bcrypt's max)
    password_bytes = password.encode('utf-8')[:72]
    return bcrypt.hashpw(password_bytes, bcrypt.gensalt()).decode('utf-8')

    """
    Converts a plain-text password into a bcrypt hash.
    Called ONCE at signup time, right before saving the user to MongoDB.
    """
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Checks a login attempt's password against the stored hash.
    Returns True/False. We NEVER decrypt the hash back to plain text
    (that's not even possible with bcrypt) -- we just re-hash the
    GUESS using the same salt and compare the results.
    """
    return pwd_context.verify(plain_password, hashed_password)


# ---- JWT token setup ----

def create_access_token(user_id: str) -> str:
    """
    Builds a signed JWT containing the user's id and an expiry time.

    Structure of the token's PAYLOAD (before signing):
        {
          "sub": "<user_id>",          <- "subject" = who this token is about
          "exp": <expiry timestamp>    <- after this, token is auto-invalid
        }

    The token is then SIGNED using JWT_SECRET_KEY. Anyone can READ a
    JWT's contents (it's just base64, not encrypted), but only someone
    with the secret key can produce a VALID signature for it. So if a
    user tampers with the token, the signature check will fail.
    """
    expire_time = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload = {"sub": user_id, "exp": expire_time}

    token = jwt.encode(
        payload,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )
    return token


def decode_access_token(token: str) -> str | None:
    """
    Verifies a token's signature and expiry, and extracts the user_id
    from it if valid. Returns None if the token is invalid/expired/tampered.

    This is called on EVERY protected request (e.g. "get my flashcards"),
    via the get_current_user dependency in deps.py.
    """
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        return payload.get("sub")
    except JWTError:
        # Covers: expired token, bad signature, malformed token, etc.
        return None
