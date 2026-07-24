-- Add created_at to profiles and backfill from auth.users.
-- The User Emails admin tab selects profiles.created_at but the column
-- never existed, so the query silently failed and showed 0 users.
-- This also adds referral_source backfill from auth user metadata.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- Backfill created_at from auth.users.created_at
UPDATE profiles p
SET created_at = u.created_at
FROM auth.users u
WHERE p.user_id = u.id
  AND p.created_at IS NULL;

-- Backfill created_at for any remaining rows
UPDATE profiles
SET created_at = updated_at
WHERE created_at IS NULL;

-- Backfill referral_source from auth user metadata
UPDATE profiles p
SET referral_source = u.raw_user_meta_data->>'referral_source'
FROM auth.users u
WHERE p.user_id = u.id
  AND p.referral_source IS NULL
  AND u.raw_user_meta_data->>'referral_source' IS NOT NULL;