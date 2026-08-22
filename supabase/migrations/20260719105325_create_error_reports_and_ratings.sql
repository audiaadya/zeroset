/*
# problem_error_reports + problem_ratings

## problem_error_reports
Stores user-submitted error/typo reports for problems.
- SELECT: host-only (so the host can triage reports).
- INSERT: any authenticated user can report.
- UPDATE/DELETE: host-only.

## problem_ratings
Stores per-user star ratings (1-5) for problems. UNIQUE (problem_id, user_id)
so each user rates a problem once; updates overwrite. The average across all
rows is the community rating shown on problem cards.
- SELECT: anyone (anon + authenticated) — so averages display publicly.
- INSERT/UPDATE/DELETE: owner-only via auth.uid() = user_id.
*/

-- 1. PROBLEM ERROR REPORTS ----------------------------------------------
CREATE TABLE IF NOT EXISTS problem_error_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id text NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE problem_error_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_error_reports_host" ON problem_error_reports;
CREATE POLICY "select_error_reports_host" ON problem_error_reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
      AND u.email IN ('miadayshaar2@gmail.com', 'audiaadya@gmail.com')
    )
  );

DROP POLICY IF EXISTS "insert_error_report" ON problem_error_reports;
CREATE POLICY "insert_error_report" ON problem_error_reports FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_error_report_host" ON problem_error_reports;
CREATE POLICY "update_error_report_host" ON problem_error_reports FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
      AND u.email IN ('miadayshaar2@gmail.com', 'audiaadya@gmail.com')
    )
  )
  WITH CHECK (true);

DROP POLICY IF EXISTS "delete_error_report_host" ON problem_error_reports;
CREATE POLICY "delete_error_report_host" ON problem_error_reports FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
      AND u.email IN ('miadayshaar2@gmail.com', 'audiaadya@gmail.com')
    )
  );

CREATE INDEX IF NOT EXISTS idx_error_reports_problem ON problem_error_reports(problem_id);
CREATE INDEX IF NOT EXISTS idx_error_reports_status ON problem_error_reports(status);

-- 2. PROBLEM RATINGS ----------------------------------------------------
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

DROP POLICY IF EXISTS "select_ratings" ON problem_ratings;
CREATE POLICY "select_ratings" ON problem_ratings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_rating" ON problem_ratings;
CREATE POLICY "insert_own_rating" ON problem_ratings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_rating" ON problem_ratings;
CREATE POLICY "update_own_rating" ON problem_ratings FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_rating" ON problem_ratings;
CREATE POLICY "delete_own_rating" ON problem_ratings FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_ratings_problem ON problem_ratings(problem_id);
