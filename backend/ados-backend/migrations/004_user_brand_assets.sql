-- Per-user brand identity assets (logos/media). Used in generations.
-- Run from ados-backend: python migrations/run_migration.py 004_user_brand_assets.sql
-- Or tables are auto-created on app startup via Base.metadata.create_all().

CREATE TABLE IF NOT EXISTS user_brand_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(32) NOT NULL,
    data_url TEXT NOT NULL,
    mime_type VARCHAR(128),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_user_brand_assets_user_id ON user_brand_assets (user_id);
