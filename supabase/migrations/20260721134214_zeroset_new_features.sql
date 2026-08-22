-- 1. PROBLEM RATINGS ------------------------------------------------
CREATE TABLE IF NOT EXISTS problem_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id text NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  rating int NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (problem_id, user_id)
);
ALTER TABLE problem_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_problem_ratings" ON problem_ratings;
CREATE POLICY "select_problem_ratings" ON problem_ratings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_problem_rating" ON problem_ratings;
CREATE POLICY "insert_own_problem_rating" ON problem_ratings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_problem_rating" ON problem_ratings;
CREATE POLICY "update_own_problem_rating" ON problem_ratings FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_problem_rating" ON problem_ratings;
CREATE POLICY "delete_own_problem_rating" ON problem_ratings FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- 2. ERROR REPORTS --------------------------------------------------
CREATE TABLE IF NOT EXISTS problem_error_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id text NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name text,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
ALTER TABLE problem_error_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_error_reports" ON problem_error_reports;
CREATE POLICY "select_error_reports" ON problem_error_reports FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_error_report" ON problem_error_reports;
CREATE POLICY "insert_own_error_report" ON problem_error_reports FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "manage_error_reports_host" ON problem_error_reports;
CREATE POLICY "manage_error_reports_host" ON problem_error_reports FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
      AND u.email IN ('miadayshaar2@gmail.com')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
      AND u.email IN ('miadayshaar2@gmail.com')
    )
  );

-- 3. SANDBOX SNAPSHOTS ----------------------------------------------
CREATE TABLE IF NOT EXISTS sandbox_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  content text NOT NULL,
  share_token text UNIQUE DEFAULT encode(gen_random_bytes(8), 'hex'),
  title text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE sandbox_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_sandbox_snapshots" ON sandbox_snapshots;
CREATE POLICY "select_sandbox_snapshots" ON sandbox_snapshots FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_sandbox_snapshot" ON sandbox_snapshots;
CREATE POLICY "insert_own_sandbox_snapshot" ON sandbox_snapshots FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "delete_own_sandbox_snapshot" ON sandbox_snapshots;
CREATE POLICY "delete_own_sandbox_snapshot" ON sandbox_snapshots FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- 4. PROBLEM DISCUSSIONS --------------------------------------------
CREATE TABLE IF NOT EXISTS problem_discussions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  author_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE problem_discussions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_problem_discussions" ON problem_discussions;
CREATE POLICY "select_problem_discussions" ON problem_discussions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_problem_discussion" ON problem_discussions;
CREATE POLICY "insert_own_problem_discussion" ON problem_discussions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "update_own_problem_discussion" ON problem_discussions;
CREATE POLICY "update_own_problem_discussion" ON problem_discussions FOR UPDATE
  TO authenticated USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "delete_own_problem_discussion" ON problem_discussions;
CREATE POLICY "delete_own_problem_discussion" ON problem_discussions FOR DELETE
  TO authenticated USING (auth.uid() = author_id);

-- 5. PROBLEM DISCUSSION REPLIES -------------------------------------
CREATE TABLE IF NOT EXISTS problem_discussion_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id uuid NOT NULL REFERENCES problem_discussions(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES problem_discussion_replies(id) ON DELETE CASCADE,
  body text NOT NULL,
  author_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE problem_discussion_replies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_problem_discussion_replies" ON problem_discussion_replies;
CREATE POLICY "select_problem_discussion_replies" ON problem_discussion_replies FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_problem_discussion_reply" ON problem_discussion_replies;
CREATE POLICY "insert_own_problem_discussion_reply" ON problem_discussion_replies FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "update_own_problem_discussion_reply" ON problem_discussion_replies;
CREATE POLICY "update_own_problem_discussion_reply" ON problem_discussion_replies FOR UPDATE
  TO authenticated USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "delete_own_problem_discussion_reply" ON problem_discussion_replies;
CREATE POLICY "delete_own_problem_discussion_reply" ON problem_discussion_replies FOR DELETE
  TO authenticated USING (auth.uid() = author_id);

-- 6. INDEXES --------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_problem_ratings_problem ON problem_ratings(problem_id);
CREATE INDEX IF NOT EXISTS idx_problem_error_reports_problem ON problem_error_reports(problem_id);
CREATE INDEX IF NOT EXISTS idx_problem_error_reports_status ON problem_error_reports(status);
CREATE INDEX IF NOT EXISTS idx_sandbox_snapshots_token ON sandbox_snapshots(share_token);
CREATE INDEX IF NOT EXISTS idx_problem_discussions_problem ON problem_discussions(problem_id);
CREATE INDEX IF NOT EXISTS idx_problem_discussion_replies_discussion ON problem_discussion_replies(discussion_id);