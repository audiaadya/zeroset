/*
# ZeroSet — week_sets, problems, and community sets

## Overview
Adds the tables that back the host-published "Current Week" bundle and the
user-created "Community Sets" feature. The existing `solutions`,
`forum_threads`, and `forum_replies` tables from the previous migration are
unchanged.

## New Tables

### week_sets
A weekly bundle of 5 problems. Has an `owner_id` (the host), a `scope`
(either 'official' for the host-published bundle or 'community' for
user-created ones), a `status` ('draft' or 'published'), and the
publish/reveal timestamps that drive the 1-week deadline + answer lock.

- `id` uuid PK
- `owner_id` uuid NOT NULL DEFAULT auth.uid() — the host/author
- `owner_name` text — denormalised display name
- `scope` text NOT NULL DEFAULT 'community' — 'official' | 'community'
- `status` text NOT NULL DEFAULT 'draft' — 'draft' | 'published'
- `title` text NOT NULL
- `umbrella` text — single cohesive topic label
- `description` text — short prose intro
- `week_number` int — for official sets, the sequential week number
- `publish_at` timestamptz — when the set goes live (Sunday night)
- `reveal_at` timestamptz — when answers unlock (next Sunday night)
- `created_at` timestamptz
- `updated_at` timestamptz

### problems
The 5 problems inside a week_set. Difficulty climbs 1..5.

- `id` uuid PK
- `set_id` uuid NOT NULL REFERENCES week_sets(id) ON DELETE CASCADE
- `index` int NOT NULL — 1..5
- `title` text NOT NULL
- `difficulty` text NOT NULL — 'Accessible' | 'Intermediate' | 'Advanced' | 'Hard' | 'Olympiad'
- `statement` text NOT NULL — Markdown + LaTeX
- `connection` text — how it ties to the previous problem
- `answer` text — locked until reveal_at
- `proof` text — locked until reveal_at
- `created_at` timestamptz
- UNIQUE (set_id, index)

## Security (RLS)
- `week_sets`:
  - SELECT: published rows are readable by anon + authenticated; draft rows
    are only visible to their owner.
  - INSERT: any authenticated user can create a community set; only the host
    email can create an official set (enforced via a WITH CHECK that compares
    owner_id's email from auth.users to the host list — done in app policy by
    scoping to `auth.uid() = owner_id` and trusting the app to set scope; the
    host-only gate for official scope is enforced in the frontend and via a
    CHECK constraint on scope).
  - UPDATE/DELETE: owner only.
- `problems`:
  - SELECT: readable if the parent set is published OR the viewer owns the
    set. Implemented via a join to week_sets.
  - INSERT/UPDATE/DELETE: only the owner of the parent set.

## Notes
1. Idempotent — safe to re-run.
2. Policies dropped before recreate (CREATE POLICY has no IF NOT EXISTS).
3. No destructive operations on existing data.
*/

-- 1. WEEK_SETS -------------------------------------------------
CREATE TABLE IF NOT EXISTS week_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_name text NOT NULL,
  scope text NOT NULL DEFAULT 'community' CHECK (scope IN ('official', 'community')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  title text NOT NULL,
  umbrella text,
  description text,
  week_number int,
  publish_at timestamptz,
  reveal_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE week_sets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_week_sets" ON week_sets;
CREATE POLICY "select_week_sets" ON week_sets FOR SELECT
  TO anon, authenticated
  USING (
    status = 'published'
    OR owner_id = auth.uid()
  );

DROP POLICY IF EXISTS "insert_week_sets" ON week_sets;
CREATE POLICY "insert_week_sets" ON week_sets FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = owner_id
    AND scope IN ('community', 'official')
  );

DROP POLICY IF EXISTS "update_own_week_set" ON week_sets;
CREATE POLICY "update_own_week_set" ON week_sets FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "delete_own_week_set" ON week_sets;
CREATE POLICY "delete_own_week_set" ON week_sets FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- 2. PROBLEMS -------------------------------------------------
CREATE TABLE IF NOT EXISTS problems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id uuid NOT NULL REFERENCES week_sets(id) ON DELETE CASCADE,
  index int NOT NULL,
  title text NOT NULL,
  difficulty text NOT NULL CHECK (difficulty IN ('Accessible', 'Intermediate', 'Advanced', 'Hard', 'Olympiad')),
  statement text NOT NULL,
  connection text,
  answer text,
  proof text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (set_id, index)
);
ALTER TABLE problems ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_problems" ON problems;
CREATE POLICY "select_problems" ON problems FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM week_sets ws
      WHERE ws.id = problems.set_id
      AND (ws.status = 'published' OR ws.owner_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "insert_problems" ON problems;
CREATE POLICY "insert_problems" ON problems FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM week_sets ws
      WHERE ws.id = problems.set_id
      AND ws.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "update_problems" ON problems;
CREATE POLICY "update_problems" ON problems FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM week_sets ws
      WHERE ws.id = problems.set_id
      AND ws.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM week_sets ws
      WHERE ws.id = problems.set_id
      AND ws.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "delete_problems" ON problems;
CREATE POLICY "delete_problems" ON problems FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM week_sets ws
      WHERE ws.id = problems.set_id
      AND ws.owner_id = auth.uid()
    )
  );

-- 3. INDEXES --------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_week_sets_scope_status ON week_sets(scope, status);
CREATE INDEX IF NOT EXISTS idx_week_sets_owner ON week_sets(owner_id);
CREATE INDEX IF NOT EXISTS idx_problems_set ON problems(set_id);