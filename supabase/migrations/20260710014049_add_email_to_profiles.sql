/*
# Add email column to profiles

1. Modified Tables
- `profiles`: Add `email` text column (nullable) to store user email addresses
  for mass email collection. Existing users will have NULL and be prompted
  to add their email on next visit.
2. Notes
- The column is nullable so existing profile rows are not affected.
- New signups will store email from auth metadata.
- A popup will prompt existing users without an email to add one.
*/

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email text;

-- Backfill email from auth.users for existing users who have auth accounts
UPDATE profiles p
SET email = u.email
FROM auth.users u
WHERE p.user_id = u.id
  AND p.email IS NULL
  AND u.email IS NOT NULL;
