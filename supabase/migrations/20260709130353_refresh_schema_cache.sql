-- Re-apply V3 feature tables to refresh schema cache
-- This ensures sudden_death_submissions, bounty_boards, reverse_eng_prompts
-- are properly registered in the schema cache

-- Ensure tables exist (IF NOT EXISTS makes this safe)
CREATE TABLE IF NOT EXISTS bounty_boards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id text NOT NULL,
  title text NOT NULL,
  fake_proof text NOT NULL,
  flaw_hint text,
  author_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'solved', 'retired')),
  solved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  solved_by_name text,
  solution_comment text,
  solved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sudden_death_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  problem_id text NOT NULL,
  week_id text NOT NULL,
  answer text NOT NULL,
  correct boolean,
  locked_out boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, problem_id)
);

CREATE TABLE IF NOT EXISTS reverse_eng_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  target_answer text NOT NULL,
  constraint_text text,
  story_problem text NOT NULL,
  title text,
  upvotes int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'spotlight', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Force schema cache refresh
NOTIFY pgrst, 'reload schema';
