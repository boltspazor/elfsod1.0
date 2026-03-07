#!/usr/bin/env python3
"""
Run SQL migrations. Uses psycopg2 and DATABASE_URL from env or .env.
From ados-backend directory:
  python migrations/run_migration.py
If you get "No module named 'psycopg2'", install deps first:
  pip install -r requirements.txt
"""
import os
import sys

# ados-backend root (parent of migrations/)
_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _root not in sys.path:
    sys.path.insert(0, _root)

# Load .env from ados-backend if present
_env_file = os.path.join(_root, ".env")
if os.path.isfile(_env_file):
    with open(_env_file) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, _, v = line.partition("=")
                k, v = k.strip(), v.strip()
                if v.startswith('"') and v.endswith('"') or v.startswith("'") and v.endswith("'"):
                    v = v[1:-1]
                os.environ.setdefault(k, v)

DATABASE_URL = os.environ.get("DATABASE_URL", "").strip()
if not DATABASE_URL:
    print("DATABASE_URL not set. Set it in .env or environment.", file=sys.stderr)
    sys.exit(1)

# psycopg2 expects postgresql:// (no +psycopg2)
if DATABASE_URL.startswith("postgresql+psycopg2://"):
    DATABASE_URL = "postgresql://" + DATABASE_URL[len("postgresql+psycopg2://"):]


def run_file(path: str) -> None:
    with open(path, "r") as f:
        sql = f.read()

    statements = [
        stmt.strip() for stmt in sql.split(";")
        if stmt.strip() and not stmt.strip().startswith("--")
    ]

    # Option 1: Use app's database engine (same Python that runs uvicorn)
    try:
        from sqlalchemy import text
        from app.database import engine
        with engine.begin() as conn:
            for stmt in statements:
                conn.execute(text(stmt))
        print(f"Ran migration: {path}")
        return
    except ImportError as e:
        pass  # Try psycopg2 next

    # Option 2: Direct psycopg2 (must be same Python that has psycopg2)
    try:
        import psycopg2
        conn = psycopg2.connect(DATABASE_URL)
        conn.autocommit = True
        try:
            with conn.cursor() as cur:
                for stmt in statements:
                    cur.execute(stmt)
        finally:
            conn.close()
        print(f"Ran migration: {path}")
        return
    except ImportError:
        pass

    # Neither available: tell user to install with the SAME python
    print("Database driver not found. Use the *same* Python that runs your backend.", file=sys.stderr)
    print(f"  This script is using: {sys.executable}", file=sys.stderr)
    print("", file=sys.stderr)
    print("From backend folder (ados-backend), run:", file=sys.stderr)
    print("  python -m pip install -r requirements.txt", file=sys.stderr)
    print("  python migrations/run_migration.py", file=sys.stderr)
    print("", file=sys.stderr)
    print("If you use a virtual environment, activate it first, then run the two lines above.", file=sys.stderr)
    sys.exit(1)


if __name__ == "__main__":
    migrations_dir = os.path.dirname(os.path.abspath(__file__))
    if len(sys.argv) < 2:
        path = os.path.join(migrations_dir, "001_add_surv_metrics_start_end_date.sql")
    else:
        name = sys.argv[1]
        if not os.path.isabs(name) and not os.path.dirname(name):
            path = os.path.join(migrations_dir, name)
        else:
            path = name
    if not os.path.isfile(path):
        print(f"File not found: {path}", file=sys.stderr)
        sys.exit(1)
    run_file(path)
