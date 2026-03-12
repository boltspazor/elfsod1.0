"""
Apply the is_official column to the South-1 database using the app's own engine.
This bypasses the migration script's .env loading to use the hardcoded South-1 default.
"""
import os
# Remove DATABASE_URL from env so it uses the hardcoded South-1 default in config.py
os.environ.pop("DATABASE_URL", None)

from sqlalchemy import text
from app.database import engine

try:
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE ads ADD COLUMN IF NOT EXISTS is_official BOOLEAN NOT NULL DEFAULT false"))
    print("✅ Column 'is_official' added (or already exists) on the South-1 database.")

    # Verify
    with engine.connect() as conn:
        result = conn.execute(text(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name='ads' AND column_name='is_official'"
        ))
        row = result.fetchone()
        print(f"   Verification: {'EXISTS' if row else 'MISSING'}")
except Exception as e:
    print(f"❌ Error: {e}")
