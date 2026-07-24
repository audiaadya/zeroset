/*
# Create sudden_death_submissions table

1. New Tables
- `sudden_death_submissions` — stores one-shot answer submissions for the Sudden Death game mode.
  - `id` (uuid, primary key)
  - `user_id` (uuid, references auth.users, not null) — the submitting user
  - `problem_id` (uuid, not null) — the problem being answered
  - `week_id` (uuid, not null) — the week set this submission belongs to
  - `answer` (text, not null) — the user's submitted answer
  - `correct` (boolean, nullable) — whether the answer was graded correct
  - `locked_out` (boolean, default false) — whether the user is locked out after a wrong answer
  - `created_at` (timestamptz, default now())
  - UNIQUE constraint on (user_id, problem_id) to enforce one submission per user per problem

2. Security
- Enable RLS on `sudden_death_submissions`.
- Owner-scoped CRUD: each authenticated user can only access their own submissions.
- All 4 policies (select/insert/update/delete) scoped to `auth.uid() = user_id`.
*/

CREATE TABLE IF NOT EXISTS sudden_death_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  problem_id uuid NOT NULL,
  week_id uuid NOT NULL,
  answer text NOT NULL,
  correct boolean,
  locked_out boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, problem_id)
);

ALTER TABLE sudden_death_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_sudden_death" ON sudden_death_submissions;
CREATE POLICY "select_own_sudden_death" ON sudden_death_submissions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_sudden_death" ON sudden_death_submissions;
CREATE POLICY "insert_own_sudden_death" ON sudden_death_submissions
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_sudden_death" ON sudden_death_submissions;
CREATE POLICY "update_own_sudden_death" ON sudden_death_submissions
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_sudden_death" ON sudden_death_submissions;
CREATE POLICY "delete_own_sudden_death" ON sudden_death_submissions
  TO authenticated USING (auth.uid() = user_id);
