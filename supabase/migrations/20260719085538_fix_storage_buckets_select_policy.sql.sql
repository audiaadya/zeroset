/*
# Fix storage.buckets SELECT policy (fixes "bucket not found" upload error)

## Problem
The `week-screenshots` bucket exists and is public, and object-level
policies allow authenticated uploads. But `storage.buckets` had NO SELECT
policy, so the anon-key client (used by the browser) cannot read the bucket
row when it does its existence check before an upload. The Supabase JS client
then surfaces this as a "bucket not found" error to the user.

## Fix
Add a SELECT policy on `storage.buckets` allowing anon + authenticated to read
bucket metadata. This is the standard Supabase pattern for public buckets:
bucket metadata is non-sensitive (id, name, public flag, file size limits),
and reading it is required for the client to resolve a bucket before upload.

## Security
- No new tables.
- Only adds a read policy on the system `storage.buckets` view.
- Write access to `storage.buckets` remains restricted to the service role
  ( Supabase managed ) — this migration does NOT grant INSERT/UPDATE/DELETE
  on buckets to any client role.
*/

DROP POLICY IF EXISTS "Anyone can read bucket metadata" ON storage.buckets;
CREATE POLICY "Anyone can read bucket metadata"
  ON storage.buckets FOR SELECT
  TO anon, authenticated
  USING (true);
