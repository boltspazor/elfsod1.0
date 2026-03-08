-- Trending ads cache for home page (24h TTL). Only ads with displayable images are stored.
-- Run from ados-backend: python migrations/run_migration.py 002_trending_ad_cache.sql
-- Or tables are auto-created on app startup via Base.metadata.create_all().

CREATE TABLE IF NOT EXISTS trending_ad_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(64) NOT NULL UNIQUE,
    ads_json JSONB NOT NULL DEFAULT '[]',
    last_fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ix_trending_ad_cache_category ON trending_ad_cache (category);
