import os
import psycopg2

# SOUTH-1 URL (from config.py)
DATABASE_URL = "postgresql://postgres.hkgcyrheviatmdflbxqu:c205abode123@aws-1-ap-south-1.pooler.supabase.com:6543/postgres"

# Connect to DB
try:
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    # Check if column exists
    cur.execute("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='ads' AND column_name='is_official';
    """)
    
    result = cur.fetchone()
    if result:
        print(f"Column 'is_official' exists in SOUTH-1 database.")
    else:
        print(f"Column 'is_official' does NOT exist in SOUTH-1 database.")
        
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
