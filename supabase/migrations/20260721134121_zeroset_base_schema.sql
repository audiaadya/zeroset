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