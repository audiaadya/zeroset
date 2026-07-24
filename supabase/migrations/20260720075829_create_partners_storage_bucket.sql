/*
# Partners storage bucket

Create a dedicated `partners` storage bucket for partner logo/screenshot
uploads, with public read and authenticated write policies.
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('partners', 'partners', true)
ON CONFLICT (id) DO NOTHING;

-- Public read
DROP POLICY IF EXISTS "Public read partners" ON storage.objects;
CREATE POLICY "Public read partners" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'partners');

-- Authenticated upload
DROP POLICY IF EXISTS "Authed upload partners" ON storage.objects;
CREATE POLICY "Authed upload partners" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'partners');

-- Authed update
DROP POLICY IF EXISTS "Authed update partners" ON storage.objects;
CREATE POLICY "Authed update partners" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'partners');

-- Authed delete
DROP POLICY IF EXISTS "Authed delete partners" ON storage.objects;
CREATE POLICY "Authed delete partners" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'partners');
