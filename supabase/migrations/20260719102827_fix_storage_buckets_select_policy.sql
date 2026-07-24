/*
# Fix storage.buckets SELECT policy (fixes "bucket not found" upload error)

The `week-screenshots` bucket exists and is public, and object-level policies
allow authenticated uploads. But `storage.buckets` had NO SELECT policy, so
the anon-key client (used by the browser) cannot read the bucket row when it
does its existence check before an upload. The Supabase JS client then surfaces
this as a "bucket not found" error.

Fix: add a SELECT policy on `storage.buckets` allowing anon + authenticated to
read bucket metadata. This is the standard Supabase pattern for public buckets.
*/

DROP POLICY IF EXISTS "Anyone can read bucket metadata" ON storage.buckets;
CREATE POLICY "Anyone can read bucket metadata"
  ON storage.buckets FOR SELECT
  TO anon, authenticated
  USING (true);
