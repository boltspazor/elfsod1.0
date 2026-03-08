-- Run this in Supabase SQL Editor if you get:
--   "Could not find the 'published_at' column of 'auto_create' in the schema cache"
-- Adds columns required by /api/campaigns/publish and my-campaigns.

ALTER TABLE public.auto_create
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

ALTER TABLE public.auto_create
  ADD COLUMN IF NOT EXISTS campaign_status TEXT;

-- Store campaign creatives (generated images/videos) when publishing
ALTER TABLE public.auto_create
  ADD COLUMN IF NOT EXISTS assets JSONB;

-- Optional: backfill existing rows so select/display works
-- UPDATE public.auto_create SET campaign_status = 'draft' WHERE campaign_status IS NULL;
