-- Per-user analyzed ads for Video Analysis (Reverse Engineering). All major platforms.
-- Run from ados-backend: python migrations/run_migration.py 003_user_analyzed_ads.sql
-- Or tables are auto-created on app startup via Base.metadata.create_all().

CREATE TABLE IF NOT EXISTS user_analyzed_ads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    platform VARCHAR(32) NOT NULL,
    source_url TEXT NOT NULL,
    external_id VARCHAR(255) NOT NULL,
    company VARCHAR(255),
    ad_title TEXT,
    ad_text TEXT,
    full_ad_text TEXT,
    call_to_action VARCHAR(255),
    analysis JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    analyzed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ix_user_analyzed_ads_user_id ON user_analyzed_ads (user_id);
CREATE INDEX IF NOT EXISTS ix_user_analyzed_ads_platform_external ON user_analyzed_ads (user_id, platform, external_id);
