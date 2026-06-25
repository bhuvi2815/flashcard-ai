"""
database.py
------------
WHAT THIS FILE DOES:
Creates ONE connection to our MongoDB Atlas database when the app starts,
and exposes the database object so other files (routes, services) can
read/write data through it.

JAVA ANALOGY:
This is like a `DataSource` bean in Spring Boot -- created once at
startup, then injected wherever it's needed, instead of opening a new
DB connection on every single request (which would be slow and wasteful).

WHY MOTOR (not pymongo directly)?
FastAPI is "async" -- it can handle many requests at once without
blocking. `pymongo` is a SYNCHRONOUS driver (blocks while waiting for
the DB to respond), which would slow FastAPI down.
`motor` is the ASYNC version of the MongoDB driver, built to work
properly with FastAPI's `async def` route functions.
"""

from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings
import certifi

# ---- Step 1: Create the client (this is like opening a "connection pool") ----
# This does NOT connect immediately -- motor connects lazily on first use.
client = AsyncIOMotorClient(settings.MONGO_URI, tlsCAFile=certifi.where())

# ---- Step 2: Pick which database inside the cluster we want to use ----
# (A MongoDB Atlas cluster can hold multiple databases; we only use one.)
database = client[settings.DB_NAME]

# ---- Step 3: Define shortcuts to our two collections ----
# A "collection" in MongoDB is roughly equivalent to a "table" in SQL,
# except documents inside it don't need a fixed schema.
users_collection = database["users"]
flashcard_sets_collection = database["flashcard_sets"]


async def ping_database():
    """
    Simple health-check function.
    Called once when the app starts up, to confirm we can actually
    reach MongoDB Atlas (e.g. catches wrong password / IP not whitelisted
    issues immediately, instead of failing later on a random request).
    """
    try:
        await client.admin.command("ping")
        print("✅ MongoDB Atlas connection successful.")
    except Exception as e:
        print("❌ MongoDB Atlas connection FAILED:", e)
        raise
