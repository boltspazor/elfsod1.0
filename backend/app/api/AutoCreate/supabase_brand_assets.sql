-- Optional: Store brand identity assets in Supabase so they persist across sessions.
-- Run in Supabase SQL Editor. Link rows to your app user via user_id (from your auth).
-- If you use this table, your app can read/write here (e.g. via a backend that uses Supabase service key).

CREATE TABLE IF NOT EXISTS public.brand_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(32) NOT NULL,
    data_url TEXT NOT NULL,
    mime_type VARCHAR(128),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_brand_assets_user_id ON public.brand_assets (user_id);

-- RLS: without Supabase Auth, allow all for anon (secure via backend only) or add policies when using Supabase Auth.
ALTER TABLE public.brand_assets ENABLE ROW LEVEL SECURITY;

-- Example policy if you later use Supabase Auth and store auth.uid() in user_id:
-- CREATE POLICY "Users can manage own brand assets" ON public.brand_assets
--   FOR ALL USING (auth.uid()::text = user_id);
