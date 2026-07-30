/*
# ZeroSet — solution votes + referral source + first blood

## Overview
Adds the data backing two new features:
1. **Post-reveal upvoting** of community solutions — a "Community Choice" proof
   per problem, surfaced after the Sunday reveal.
2. **Referral source** on sign-up — where did you hear about ZeroSet? Stored on
   the profile row so the host can see the breakdown.
3. **First Blood** — the first user to mark a solution correct for a problem
   during its live week. Derived from `solutions.is_correct` + `created_at` +
   the parent set's `reveal_at`, but cached on the problem row for fast reads.

## Changes

### solution_votes (new)
- `id` uuid PK
- `solution_id` uuid NOT NULL REFERENCES solutions(id) ON DELETE CASCADE
- `voter_id` uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE
- `created_at` timestamptz
- UNIQUE (solution_id, voter_id) — one vote per user per solution

### profiles (altered)
- `referral_source` text — one of 'youtube', 'reddit', 'social-media',
  'friends', 'family', 'other'. Nullable; set at sign-up.

### problems (altered)
- `first_blood_user_id` uuid — the first user to mark a solution correct on
  this problem during its live week. Nullable.
- `first_blood_user_name` text — denormalised display name for fast reads.

## Security (RLS)
- `solution_votes`:
  - SELECT: open to anon + authenticated (vote counts are public).
  - INSERT: only the voter, scoped by `auth.uid() = voter_id`.
  - DELETE: only the voter (to remove their vote).
  - No UPDATE — votes are insert/delete only.
- `profiles` referral_source: covered by the existing owner-scoped UPDATE
  policy.
- `problems` first_blood_*: covered by the existing owner-scoped UPDATE
  policy on problems (the host/owner sets it when marking correct). The
  frontend will also allow the host to set it via the existing
  `update_solution_host` policy on solutions.

## Notes
1. Idempotent — safe to re-run.
2. No destructive operations; existing rows get nulls/defaults.
3. Policies dropped before recreate.
*/

-- 1. solution_votes ------------------------------------------------
CREATE TABLE IF NOT EXISTS solution_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solution_id uuid NOT NULL REFERENCES solutions(id) ON DELETE CASCADE,
  voter_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (solution_id, voter_id)
);
ALTER TABLE solution_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_votes" ON solution_votes;
CREATE POLICY "select_votes" ON solution_votes FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_vote" ON solution_votes;
CREATE POLICY "insert_own_vote" ON solution_votes FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = voter_id);

DROP POLICY IF EXISTS "delete_own_vote" ON solution_votes;
CREATE POLICY "delete_own_vote" ON solution_votes FOR DELETE
  TO authenticated USING (auth.uid() = voter_id);

-- 2. profiles.referral_source --------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'referral_source'
  ) THEN
    ALTER TABLE profiles ADD COLUMN referral_source text;
  END IF;
END $$;

-- 3. problems.first_blood_* ----------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'problems' AND column_name = 'first_blood_user_id'
  ) THEN
    ALTER TABLE problems ADD COLUMN first_blood_user_id uuid;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'problems' AND column_name = 'first_blood_user_name'
  ) THEN
    ALTER TABLE problems ADD COLUMN first_blood_user_name text;
  END IF;
END $$;

-- 4. Indexes --------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_solution_votes_solution ON solution_votes(solution_id);
CREATE INDEX IF NOT EXISTS idx_solution_votes_voter ON solution_votes(voter_id);
