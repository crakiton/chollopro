-- Enable UUID extension if not enabled (usually enabled by default in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the deals table
CREATE TABLE IF NOT EXISTS public.deals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    price NUMERIC NOT NULL,
    url TEXT UNIQUE NOT NULL,
    photo_url TEXT,
    score INTEGER NOT NULL,
    reason TEXT,
    location TEXT,
    has_shipping BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS deals_url_idx ON public.deals(url);
CREATE INDEX IF NOT EXISTS deals_created_at_idx ON public.deals(created_at DESC);

-- Enable Row Level Security (RLS) but allow public access for this personal tool
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

-- Allow public read access to deals
CREATE POLICY "Allow public read access to deals"
    ON public.deals
    FOR SELECT
    USING (true);

-- Allow public insert access to deals (scraper will use service key or anon if configured)
-- For a personal project where only the scraper inserts, anon insert is okay if we use service role.
-- But since the prompt said "personal use, no auth needed", we allow inserting.
CREATE POLICY "Allow public insert access to deals"
    ON public.deals
    FOR INSERT
    WITH CHECK (true);


-- Create the config table
CREATE TABLE IF NOT EXISTS public.config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    keyword TEXT,
    category TEXT,
    min_price NUMERIC,
    max_price NUMERIC,
    location_mode TEXT DEFAULT 'shipping', -- 'city_radius' or 'shipping'
    city TEXT,
    radius_km INTEGER,
    min_score INTEGER DEFAULT 7,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert a default config row if empty
INSERT INTO public.config (id, keyword, category, location_mode, min_score)
VALUES (uuid_generate_v4(), 'iphone 13', 'technology', 'shipping', 7)
ON CONFLICT DO NOTHING;

-- Enable RLS for config
ALTER TABLE public.config ENABLE ROW LEVEL SECURITY;

-- Allow public read/update access to config
CREATE POLICY "Allow public read access to config"
    ON public.config
    FOR SELECT
    USING (true);

CREATE POLICY "Allow public update access to config"
    ON public.config
    FOR UPDATE
    USING (true);

CREATE POLICY "Allow public insert access to config"
    ON public.config
    FOR INSERT
    WITH CHECK (true);

-- Add description column to deals table if it doesn't exist yet
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS description TEXT;
