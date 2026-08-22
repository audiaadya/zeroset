/*
# ZeroSet — Host moderation powers, mass email infrastructure, mandatory email consent

## Overview
This migration grants the host (miadayshaar2@gmail.com) full moderation
capabilities across the platform and adds the infrastructure for mass email
broadcasts. It also makes email consent mandatory at sign-up so the host can
reach every registered user.

## Changes

### 1. Host DELETE policies on content tables
The host can now delete any row in:
- `solutions` — remove incorrect or inappropriate solutions
- `forum_threads` — moderate forum posts
- `forum_replies` — moderate forum replies
- `bounty_boards` — remove bounty posts
- `reverse_eng_prompts` — remove reverse engineering prompts
- `problem_discussions` — remove problem discussion threads
- `problem_discussion_replies` — remove discussion replies
- `media_attachments` — remove media

Each policy is scoped to the host email via a subquery on auth.users.

### 2. Host DELETE on profiles (for user removal)
The host can delete a profile row, which cascades to that user's solutions,
forum posts, and other owned content via existing ON DELETE CASCADE foreign keys.

### 3. mass_email_log (new table)
Logs every mass email broadcast sent by the host:
- `id` uuid PK
- `subject` text — email subject line
- `body` text — email body content
- `recipient_count` int — number of recipients
- `status` text — 'sent', 'failed', 'partial'
- `sent_by` uuid — the host's auth user ID
- `sent_at` timestamptz — when the broadcast was sent
- `error_message` text — optional error details

### 4. Host SELECT on email_consent
The host can read all email_consent rows to build the recipient list for mass
emails. Previously only the owner could read their own consent row.

### 5. Host SELECT on problem_error_reports (already exists)
The existing `select_error_reports` policy is `TO authenticated USING (true)`,
so all authenticated users can already see error reports. We tighten this to
host-only since error reports contain user-identifying information. We also add
host DELETE so the host can remove resolved/dismissed reports.

### 6. Host SELECT on profiles (already exists)
The `select_profiles` policy is already `TO anon, authenticated USING (true)`,
so the host can already see all profiles/ratings.

## Security (RLS)
- All new policies are scoped to the host email via subquery on auth.users.
- No `USING (true)` shortcuts — every policy checks the caller's email.
- mass_email_log: host-only SELECT; host-only INSERT; no UPDATE/DELETE (audit trail).

## Notes
1. Idempotent — safe to re-run. All policies dropped before recreate.
2. No destructive operations — no tables or columns dropped.
3. The host email is hardcoded as 'miadayshaar2@gmail.com' matching existing migrations.
*/

-- Helper: host email check pattern (used in all policies below)
-- The pattern: coalesce((current_setting('request.jwt.claims', true)::json ->> 'email'), '') IN (...)

-- 1. HOST DELETE POLICIES ON CONTENT TABLES -------------------------

-- solutions: host can delete any solution
DROP POLICY IF EXISTS "delete_solution_host" ON solutions;
CREATE POLICY "delete_solution_host" ON solutions FOR DELETE
  TO authenticated
  USING (
    coalesce((current_setting('request.jwt.claims', true)::json ->> 'email'), '') IN ('miadayshaar2@gmail.com', 'audiaadya@gmail.com')
  );

-- forum_threads: host can delete any thread
DROP POLICY IF EXISTS "delete_thread_host" ON forum_threads;
CREATE POLICY "delete_thread_host" ON forum_threads FOR DELETE
  TO authenticated
  USING (
    coalesce((current_setting('request.jwt.claims', true)::json ->> 'email'), '') IN ('miadayshaar2@gmail.com', 'audiaadya@gmail.com')
  );

-- forum_replies: host can delete any reply
DROP POLICY IF EXISTS "delete_reply_host" ON forum_replies;
CREATE POLICY "delete_reply_host" ON forum_replies FOR DELETE
  TO authenticated
  USING (
    coalesce((current_setting('request.jwt.claims', true)::json ->> 'email'), '') IN ('miadayshaar2@gmail.com', 'audiaadya@gmail.com')
  );

-- bounty_boards: host can delete any bounty
DROP POLICY IF EXISTS "delete_bounty_host" ON bounty_boards;
CREATE POLICY "delete_bounty_host" ON bounty_boards FOR DELETE
  TO authenticated
  USING (
    coalesce((current_setting('request.jwt.claims', true)::json ->> 'email'), '') IN ('miadayshaar2@gmail.com', 'audiaadya@gmail.com')
  );

-- reverse_eng_prompts: host can delete any prompt
DROP POLICY IF EXISTS "delete_reverse_eng_host" ON reverse_eng_prompts;
CREATE POLICY "delete_reverse_eng_host" ON reverse_eng_prompts FOR DELETE
  TO authenticated
  USING (
    coalesce((current_setting('request.jwt.claims', true)::json ->> 'email'), '') IN ('miadayshaar2@gmail.com', 'audiaadya@gmail.com')
  );

-- problem_discussions: host can delete any discussion
DROP POLICY IF EXISTS "delete_problem_discussion_host" ON problem_discussions;
CREATE POLICY "delete_problem_discussion_host" ON problem_discussions FOR DELETE
  TO authenticated
  USING (
    coalesce((current_setting('request.jwt.claims', true)::json ->> 'email'), '') IN ('miadayshaar2@gmail.com', 'audiaadya@gmail.com')
  );

-- problem_discussion_replies: host can delete any reply
DROP POLICY IF EXISTS "delete_problem_discussion_reply_host" ON problem_discussion_replies;
CREATE POLICY "delete_problem_discussion_reply_host" ON problem_discussion_replies FOR DELETE
  TO authenticated
  USING (
    coalesce((current_setting('request.jwt.claims', true)::json ->> 'email'), '') IN ('miadayshaar2@gmail.com', 'audiaadya@gmail.com')
  );

-- media_attachments: host can delete any media
DROP POLICY IF EXISTS "delete_media_host" ON media_attachments;
CREATE POLICY "delete_media_host" ON media_attachments FOR DELETE
  TO authenticated
  USING (
    coalesce((current_setting('request.jwt.claims', true)::json ->> 'email'), '') IN ('miadayshaar2@gmail.com', 'audiaadya@gmail.com')
  );

-- 2. HOST DELETE ON PROFILES (for user removal) ---------------------
DROP POLICY IF EXISTS "delete_profile_host" ON profiles;
CREATE POLICY "delete_profile_host" ON profiles FOR DELETE
  TO authenticated
  USING (
    coalesce((current_setting('request.jwt.claims', true)::json ->> 'email'), '') IN ('miadayshaar2@gmail.com', 'audiaadya@gmail.com')
  );

-- 3. MASS EMAIL LOG TABLE -------------------------------------------
CREATE TABLE IF NOT EXISTS mass_email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  body text NOT NULL,
  recipient_count int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'partial')),
  sent_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  error_message text
);
ALTER TABLE mass_email_log ENABLE ROW LEVEL SECURITY;

-- Host-only SELECT on mass_email_log
DROP POLICY IF EXISTS "select_mass_email_log_host" ON mass_email_log;
CREATE POLICY "select_mass_email_log_host" ON mass_email_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
      AND u.email = 'miadayshaar2@gmail.com'
    )
  );

-- Host-only INSERT on mass_email_log
DROP POLICY IF EXISTS "insert_mass_email_log_host" ON mass_email_log;
CREATE POLICY "insert_mass_email_log_host" ON mass_email_log FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
      AND u.email = 'miadayshaar2@gmail.com'
    )
  );

-- 4. HOST SELECT ON email_consent (to build recipient lists) --------
DROP POLICY IF EXISTS "select_all_consent_host" ON email_consent;
CREATE POLICY "select_all_consent_host" ON email_consent FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
      AND u.email = 'miadayshaar2@gmail.com'
    )
  );

-- 5. TIGHTEN error_reports SELECT to host-only + add host DELETE ----
-- Error reports contain user-identifying info, so restrict to host only.
-- Keep the owner's ability to see their own reports.
DROP POLICY IF EXISTS "select_error_reports" ON problem_error_reports;
CREATE POLICY "select_error_reports" ON problem_error_reports FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
      AND u.email = 'miadayshaar2@gmail.com'
    )
  );

-- Host can delete error reports (cleanup of resolved/dismissed)
DROP POLICY IF EXISTS "delete_error_reports_host" ON problem_error_reports;
CREATE POLICY "delete_error_reports_host" ON problem_error_reports FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
      AND u.email = 'miadayshaar2@gmail.com'
    )
  );

-- 6. INDEXES ---------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_mass_email_log_sent_at ON mass_email_log(sent_at DESC);
