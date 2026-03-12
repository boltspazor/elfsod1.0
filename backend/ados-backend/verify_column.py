import os
import psycopg2
from dotenv import load_dotenv

# Load .env
load_dotenv()
DATABASE_URL = os.environ.get("DATABASE_URL")

if not DATABASE_URL:
    print("DATABASE_URL not found")
    exit(1)

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
        print(f"Column 'is_official' exists in table 'ads'.")
    else:
        print(f"Column 'is_official' does NOT exist in table 'ads'.")
        
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
