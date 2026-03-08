# Database migrations

## When do I need to run migrations?

- **Locally:** You can either:
  1. **Restart the backend** – `Base.metadata.create_all(bind=engine)` runs on startup and creates any missing tables (including `user_analyzed_ads` and `user_brand_assets`). No manual migration needed.
  2. **Run migrations explicitly** – If you prefer to apply SQL by hand (e.g. to match production), run the script against your local DB (see below).

- **Production:** You should ensure the tables exist in the **production database**:
  1. **If your deploy runs the FastAPI app** – The same `create_all()` runs on first request/startup, so tables are created automatically. No extra step if you’re okay with that.
  2. **If you manage schema via migrations** – Run the migration script against the **production** `DATABASE_URL` (e.g. from CI/CD or a one-off job) so `user_analyzed_ads` and `user_brand_assets` exist before or right after deploy.

So: **locally**, a restart is enough unless you prefer running migrations. **In prod**, either rely on `create_all()` on app startup or run the migration against the prod DB.

## How to run a migration

From the `ados-backend` directory, with `DATABASE_URL` set (e.g. in `.env`):

```bash
python migrations/run_migration.py 003_user_analyzed_ads.sql
python migrations/run_migration.py 004_user_brand_assets.sql
python migrations/run_migration.py 005_campaign_ads.sql
```

Use the same Python environment that runs the backend (and that has the DB driver installed).
