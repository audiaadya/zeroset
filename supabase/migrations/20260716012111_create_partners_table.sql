/*
# Create partners table

1. New Tables
- `partners` — stores partner showcase entries with screenshots.
  - `id` (uuid, primary key)
  - `name` (text, not null) — partner name
  - `description` (text, nullable) — description of the partner
  - `image_url` (text, nullable) — screenshot/logo URL
  - `link_url` (text, nullable) — external link
  - `sort_order` (int, default 0)
  - `created_at` (timestamptz, default now())

2. Security
- Enable RLS on `partners`.
- SELECT: anyone can view
- INSERT/UPDATE/DELETE: authenticated only (host manages)
*/

CREATE TABLE IF NOT EXISTS partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  image_url text,
  link_url text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE partners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_partners" ON partners;
CREATE POLICY "select_partners" ON partners FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_partners" ON partners;
CREATE POLICY "insert_partners" ON partners FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_partners" ON partners;
CREATE POLICY "update_partners" ON partners FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_partners" ON partners;
CREATE POLICY "delete_partners" ON partners FOR DELETE
  TO authenticated USING (true);

-- Use the week-screenshots bucket for partner images too
