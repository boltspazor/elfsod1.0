# Database migrations

Run from the `ados-backend` directory.

**If you get `ModuleNotFoundError` (e.g. No module named 'sqlalchemy' or 'psycopg2'):** install backend dependencies first:

```bash
cd backend/ados-backend
pip install -r requirements.txt
```

Then run the migration.

## Add `start_date` and `end_date` to `surv_metrics`

If you see: **column surv_metrics.start_date does not exist** (e.g. when calculating targeting intelligence), run:

```bash
cd backend/ados-backend
pip install -r requirements.txt
python migrations/run_migration.py
```

Or run the SQL manually in your PostgreSQL client:

```sql
ALTER TABLE surv_metrics ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE surv_metrics ADD COLUMN IF NOT EXISTS end_date DATE;
```
