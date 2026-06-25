"""
main.py
-------
WHAT THIS FILE DOES:
This is the ENTRY POINT of the whole backend -- the file you actually
run (`uvicorn app.main:app`) to start the server.

JAVA ANALOGY:
This is the equivalent of your `Application.java` file with
`@SpringBootApplication` + `main()` method -- it wires together all
the pieces (routers, middleware, startup checks) into one running app.

WHAT HAPPENS HERE:
  1. Create the FastAPI app instance.
  2. Add CORS middleware (so the Next.js frontend, running on a
     DIFFERENT domain, is allowed to call this API from the browser).
  3. Register our two routers (auth_routes, flashcard_routes).
  4. Add a startup event that pings MongoDB to confirm the connection
     works the moment the server boots.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.database import ping_database
from app.routes import auth_routes, flashcard_routes


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI's modern way of running "startup" and "shutdown" code.
    Everything BEFORE `yield` runs once when the server starts.
    Everything AFTER `yield` would run once when the server shuts down
    (we don't need any shutdown logic here, so it's empty).
    """
    await ping_database()
    yield


app = FastAPI(
    title="Smart Flashcard Generator API",
    description="AI-powered flashcard generation from study notes using local NLP models.",
    version="1.0.0",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS (Cross-Origin Resource Sharing)
# ---------------------------------------------------------------------------
# By default, browsers BLOCK JavaScript on one domain (your Vercel frontend)
# from calling an API on a different domain (your Render backend), unless
# the API explicitly allows it via these headers. This middleware adds
# those headers automatically to every response.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Register routers
# ---------------------------------------------------------------------------
# This is where /auth/* and /flashcards/* routes actually get "mounted"
# onto the app. Without these two lines, the route files we wrote would
# exist but never actually be reachable.
app.include_router(auth_routes.router)
app.include_router(flashcard_routes.router)


@app.get("/")
async def root():
    """
    Simple health-check route at the root URL. Useful for confirming
    the deployed backend is alive (e.g. Render's free tier "spins down"
    inactive services -- hitting this URL wakes it back up).
    """
    return {"status": "ok", "message": "Smart Flashcard Generator API is running."}
