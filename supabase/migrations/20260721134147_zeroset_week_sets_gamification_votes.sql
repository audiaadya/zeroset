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