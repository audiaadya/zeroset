/*
# ZeroSet — add is_correct to solutions + profiles table

## Overview
Adds the data backing the gamified account stats page:
1. An `is_correct` boolean on `solutions` so users (or the host) can mark a
   submitted solution as correct. Drives the "questions you got right" count.
2. A new `profiles` table storing per-user gamification state: XP, level,
   streak, and last-activity timestamp. Derived from solutions + forum posts
   but cached for fast reads.

## Changes

### solutions (altered)
- `is_correct` boolean NOT NULL DEFAULT false — whether the solution is
  marked correct. Defaults to false on insert; the author (or the host) can
  flip it.

### profiles (new)
- `id` uuid PK = auth.users.id (one row per user)
- `user_id` uuid NOT NULL UNIQUE DEFAULT auth.uid() — the owner
- `display_name` text
- `xp` int NOT NULL DEFAULT 0 — experience points
- `level` int NOT NULL DEFAULT 1 — derived from XP, stored for fast reads
- `streak` int NOT NULL DEFAULT 0 — consecutive weeks with a submission
- `last_activity_week` text — e.g. '2026-W27', used to compute streaks
- `solutions_count` int NOT NULL DEFAULT 0 — denormalised count
- `correct_count` int NOT NULL DEFAULT 0 — denormalised count
- `posts_count` int NOT NULL DEFAULT 0 — forum threads + replies
- `updated_at` timestamptz

## Security (RLS)
- `profiles`: SELECT is open to anon + authenticated (leaderboard reads).
  INSERT/UPDATE only the owner, via `auth.uid() = user_id`. The owner column
  defaults to `auth.uid()` so inserts that omit it still satisfy the policy.
- `solutions` policies: the existing `update_own_solution` already covers the
  new `is_correct` column (it's the same row-level check). We add a separate
  policy allowing the host to update `is_correct` on any solution — scoped by
  email via a subquery on auth.users. (Implemented as a second UPDATE policy
  with a USING clause that checks the caller's email is in the host list.)

## Notes
1. Idempotent — safe to re-run.
2. No destructive operations; existing solution rows get `is_correct = false`.
3. Policies dropped before recreate.
*/

-- 1. Add is_correct to solutions ---------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'solutions' AND column_name = 'is_correct'
  ) THEN
    ALTER TABLE solutions ADD COLUMN is_correct boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Allow the host to mark any solution correct/incorrect (in addition to the
-- owner's existing update policy). The host is identified by email.
DROP POLICY IF EXISTS "update_solution_host" ON solutions;
CREATE POLICY "update_solution_host" ON solutions FOR UPDATE
  TO authenticated
  USING (
    coalesce((current_setting('request.jwt.claims', true)::json ->> 'email'), '') IN ('miadayshaar2@gmail.com', 'audiaadya@gmail.com')
  )
  WITH CHECK (
    coalesce((current_setting('request.jwt.claims', true)::json ->> 'email'), '') IN ('miadayshaar2@gmail.com', 'audiaadya@gmail.com')
  );

-- 2. profiles table -----------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  xp int NOT NULL DEFAULT 0,
  level int NOT NULL DEFAULT 1,
  streak int NOT NULL DEFAULT 0,
  last_activity_week text,
  solutions_count int NOT NULL DEFAULT 0,
  correct_count int NOT NULL DEFAULT 0,
  posts_count int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_profiles" ON profiles;
CREATE POLICY "select_profiles" ON profiles FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_profile" ON profiles;
CREATE POLICY "delete_own_profile" ON profiles FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- 3. Indexes ------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_solutions_correct ON solutions(author_id, is_correct);
CREATE INDEX IF NOT EXISTS idx_profiles_xp ON profiles(xp DESC);
