-- Ads per campaign (AutoCreate). Fetched when user opens a campaign; stored here.
-- Run: python migrations/run_migration.py 005_campaign_ads.sql

CREATE TABLE IF NOT EXISTS campaign_ads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id INTEGER NOT NULL,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    ad_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_campaign_ads_campaign_user ON campaign_ads (campaign_id, user_id);
