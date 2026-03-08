-- Fix: allow campaign_status = 'published' (was failing check constraint 23514).
-- Run in Supabase SQL Editor if you get:
--   new row for relation "auto_create" violates check constraint "auto_create_campaign_status_check"

-- Drop the existing check so we can allow 'published'
ALTER TABLE public.auto_create
  DROP CONSTRAINT IF EXISTS auto_create_campaign_status_check;

-- Re-add constraint allowing values used by the app: draft, published, and optional active
ALTER TABLE public.auto_create
  ADD CONSTRAINT auto_create_campaign_status_check
  CHECK (campaign_status IS NULL OR campaign_status IN ('draft', 'published', 'active'));
