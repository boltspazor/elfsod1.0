-- Add is_official to ads: True = from company ad library (Meta/Google company endpoint).
-- Run: python migrations/run_migration.py 006_ads_is_official.sql

ALTER TABLE ads ADD COLUMN IF NOT EXISTS is_official BOOLEAN NOT NULL DEFAULT false;
