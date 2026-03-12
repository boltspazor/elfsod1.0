"""Directly add is_official column to the South-1 Supabase database."""
import psycopg2

DATABASE_URL = (
    "postgresql://postgres.hkgcyrheviatmdflbxqu:c205abode123"
    "@aws-1-ap-south-1.pooler.supabase.com:6543/postgres"
    "?sslmode=require"
)

try:
    conn = psycopg2.connect(DATABASE_URL, connect_timeout=15)
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute("ALTER TABLE ads ADD COLUMN IF NOT EXISTS is_official BOOLEAN NOT NULL DEFAULT false;")
    print("✅ Column 'is_official' added (or already exists) on South-1 database.")
    cur.execute("""
        SELECT column_name FROM information_schema.columns
        WHERE table_name='ads' AND column_name='is_official';
    """)
    result = cur.fetchone()
    print(f"   Verification: {'EXISTS' if result else 'MISSING'}")
    cur.close()
    conn.close()
except Exception as e:
    print(f"❌ Error: {e}")
