/*
# Create week_screenshots table

1. New Tables
- `week_screenshots` — stores screenshot images for weekly problem sets.
  - `id` (uuid, primary key)
  - `week_id` (uuid, not null) — the week set this screenshot belongs to
  - `image_url` (text, not null) — the public URL of the uploaded image
  - `caption` (text, nullable) — optional caption
  - `sort_order` (int, default 0) — display order
  - `created_at` (timestamptz, default now())

2. Security
- Enable RLS on `week_screenshots`.
- SELECT: anyone (anon + authenticated) can view screenshots
- INSERT/UPDATE/DELETE: only authenticated users (host will manage)
*/

CREATE TABLE IF NOT EXISTS week_screenshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id uuid NOT NULL,
  image_url text NOT NULL,
  caption text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE week_screenshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_week_screenshots" ON week_screenshots;
CREATE POLICY "select_week_screenshots" ON week_screenshots FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_week_screenshots" ON week_screenshots;
CREATE POLICY "insert_week_screenshots" ON week_screenshots FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_week_screenshots" ON week_screenshots;
CREATE POLICY "update_week_screenshots" ON week_screenshots FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_week_screenshots" ON week_screenshots;
CREATE POLICY "delete_week_screenshots" ON week_screenshots FOR DELETE
  TO authenticated USING (true);

-- Create a storage bucket for week screenshots
INSERT INTO storage.buckets (id, name, public)
VALUES ('week-screenshots', 'week-screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: anyone can read, authenticated can upload
DROP POLICY IF EXISTS "Public read week-screenshots" ON storage.objects;
CREATE POLICY "Public read week-screenshots" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'week-screenshots');

DROP POLICY IF EXISTS "Authed upload week-screenshots" ON storage.objects;
CREATE POLICY "Authed upload week-screenshots" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'week-screenshots');

DROP POLICY IF EXISTS "Authed update week-screenshots" ON storage.objects;
CREATE POLICY "Authed update week-screenshots" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'week-screenshots');

DROP POLICY IF EXISTS "Authed delete week-screenshots" ON storage.objects;
CREATE POLICY "Authed delete week-screenshots" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'week-screenshots');
