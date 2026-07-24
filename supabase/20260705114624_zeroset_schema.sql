/*
# Zeroset — schema for solutions, forum threads, and nested replies

## Overview
Creates three tables that back the interactive features of the Zeroset math
blog + community platform (a static React frontend talking to Supabase):

1. `solutions` — one row per (problem, user). Users edit/delete their own.
2. `forum_threads` — top-level posts in a topic.
3. `forum_replies` — nested replies (self-referencing `parent_id`).

## Tables

### solutions
- `id` uuid PK
- `problem_id` text — references a problem in a weekly bundle (e.g. "w1-p3")
- `week_id` text — references the week (e.g. "week-1")
- `author_id` uuid NOT NULL DEFAULT auth.uid() — owner, cascades on user delete
- `author_name` text — denormalised display name for fast reads
- `body` text — Markdown + LaTeX body
- `created_at` timestamptz
- UNIQUE (problem_id, author_id) — one solution per problem per user

### forum_threads
- `id` uuid PK
- `topic_id` text — references a forum topic slug (e.g. "olympiad-prep")
- `title` text
- `body` text — Markdown + LaTeX
- `author_id` uuid NOT NULL DEFAULT auth.uid()
- `author_name` text
- `created_at` timestamptz

### forum_replies
- `id` uuid PK
- `thread_id` uuid → forum_threads(id) ON DELETE CASCADE
- `parent_id` uuid → forum_replies(id) ON DELETE CASCADE (nullable for top-level replies)
- `body` text
- `author_id` uuid NOT NULL DEFAULT auth.uid()
- `author_name` text
- `created_at` timestamptz

## Security (RLS)
- `solutions`: SELECT is open to any authenticated user (so community solutions
  can be browsed after submitting your own). INSERT/UPDATE/DELETE are
  owner-scoped via `auth.uid() = author_id`.
- `forum_threads` and `forum_replies`: SELECT is open to anon + authenticated
  (the forum is publicly readable). INSERT/UPDATE/DELETE are owner-scoped.
- Owner columns default to `auth.uid()` so frontend inserts that omit the
  owner still satisfy the WITH CHECK policy.

## Indexes
- `idx_solutions_problem`, `idx_solutions_author`
- `idx_threads_topic`
- `idx_replies_thread`, `idx_replies_parent`

## Notes
1. This migration is idempotent — safe to re-run.
2. Policies are dropped before recreate because CREATE POLICY does not
   support IF NOT EXISTS reliably.
3. No destructive operations; existing data is preserved.
*/

-- 1. SOLUTIONS -------------------------------------------------
CREATE TABLE IF NOT EXISTS solutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id text NOT NULL,
  week_id text NOT NULL,
  author_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (problem_id, author_id)
);
ALTER TABLE solutions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_solutions" ON solutions;
CREATE POLICY "select_solutions" ON solutions FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_solution" ON solutions;
CREATE POLICY "insert_own_solution" ON solutions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "update_own_solution" ON solutions;
CREATE POLICY "update_own_solution" ON solutions FOR UPDATE
  TO authenticated USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "delete_own_solution" ON solutions;
CREATE POLICY "delete_own_solution" ON solutions FOR DELETE
  TO authenticated USING (auth.uid() = author_id);

-- 2. FORUM THREADS --------------------------------------------
CREATE TABLE IF NOT EXISTS forum_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  author_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE forum_threads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_threads" ON forum_threads;
CREATE POLICY "select_threads" ON forum_threads FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_thread" ON forum_threads;
CREATE POLICY "insert_own_thread" ON forum_threads FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "update_own_thread" ON forum_threads;
CREATE POLICY "update_own_thread" ON forum_threads FOR UPDATE
  TO authenticated USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "delete_own_thread" ON forum_threads;
CREATE POLICY "delete_own_thread" ON forum_threads FOR DELETE
  TO authenticated USING (auth.uid() = author_id);

-- 3. FORUM REPLIES (nested) -----------------------------------
CREATE TABLE IF NOT EXISTS forum_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES forum_replies(id) ON DELETE CASCADE,
  body text NOT NULL,
  author_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE forum_replies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_replies" ON forum_replies;
CREATE POLICY "select_replies" ON forum_replies FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_reply" ON forum_replies;
CREATE POLICY "insert_own_reply" ON forum_replies FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "update_own_reply" ON forum_replies;
CREATE POLICY "update_own_reply" ON forum_replies FOR UPDATE
  TO authenticated USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "delete_own_reply" ON forum_replies;
CREATE POLICY "delete_own_reply" ON forum_replies FOR DELETE
  TO authenticated USING (auth.uid() = author_id);

-- 4. INDEXES for fast lookups ---------------------------------
CREATE INDEX IF NOT EXISTS idx_solutions_problem ON solutions(problem_id);
CREATE INDEX IF NOT EXISTS idx_solutions_author ON solutions(author_id);
CREATE INDEX IF NOT EXISTS idx_threads_topic ON forum_threads(topic_id);
CREATE INDEX IF NOT EXISTS idx_replies_thread ON forum_replies(thread_id);
CREATE INDEX IF NOT EXISTS idx_replies_parent ON forum_replies(parent_id);
