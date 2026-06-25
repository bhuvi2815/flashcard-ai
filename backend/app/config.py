"""
config.py
---------
WHAT THIS FILE DOES:
Reads values from the .env file (like DB connection string, JWT secret)
and exposes them as a single Python object called `settings`.

JAVA ANALOGY:
This is similar to having an `application.properties` file in Spring Boot,
plus a `@ConfigurationProperties` class that loads those values into
typed Java fields. Here, pydantic-settings does that job for us.

WHY WE DO THIS (instead of os.getenv() everywhere):
1. We get autocomplete + type checking on settings.MONGO_URI etc.
2. All config is in ONE place, so if something is missing,
   the app fails fast at startup with a clear error -- not silently
   at some random point deep in the code.
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ----- These field names MUST match the keys in your .env file -----
    MONGO_URI: str
    DB_NAME: str

    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"          # default value if not set in .env
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # default = 24 hours

    FRONTEND_ORIGIN: str = "http://localhost:3000"

    class Config:
        # Tells pydantic-settings to read these values from a file
        # named ".env" sitting in the backend's root folder.
        env_file = ".env"


# We create ONE instance of Settings here.
# Every other file in the backend will import THIS object
# (e.g. `from app.config import settings`) instead of creating
# their own -- so the .env file is only ever read once.
settings = Settings()
