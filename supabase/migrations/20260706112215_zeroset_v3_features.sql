/*
# ZeroSet — V3 Feature Schema

## Overview
Adds tables for:
1. site_visits — anonymous page-hit counter for analytics
2. bounty_boards — "Fake Proof" bounty board posts + flaw submissions
3. sudden_death_submissions — one-shot weekly attempts with 1.5x multiplier
4. reverse_eng_prompts — "Build the Question" sandbox prompts + community submissions
5. media_attachments — image/video URLs attached to problems and solutions
6. email_consent — marketing email opt-in flag per user
7. ai_tag_suggestions — cached AI-suggested tags for a problem statement
*/

-- 1. SITE VISITS ----------------------------------------------------
CREATE TABLE IF NOT EXISTS site_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path text NOT NULL,
  visitor_hash text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  visited_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE site_visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "insert_site_visit" ON site_visits;
CREATE POLICY "insert_site_visit" ON site_visits FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "select_site_visits_host" ON site_visits;
CREATE POLICY "select_site_visits_host" ON site_visits FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
      AND u.email IN ('miadayshaar2@gmail.com')
    )
  );

CREATE INDEX IF NOT EXISTS idx_site_visits_path ON site_visits(path);
CREATE INDEX IF NOT EXISTS idx_site_visits_visited_at ON site_visits(visited_at);

-- 2. BOUNTY BOARD (Fake Proof) -------------------------------------
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
ALTER TABLE bounty_boards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_bounty" ON bounty_boards;
CREATE POLICY "select_bounty" ON bounty_boards FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_bounty" ON bounty_boards;
CREATE POLICY "insert_own_bounty" ON bounty_boards FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "update_bounty" ON bounty_boards;
CREATE POLICY "update_bounty" ON bounty_boards FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_own_bounty" ON bounty_boards;
CREATE POLICY "delete_own_bounty" ON bounty_boards FOR DELETE
  TO authenticated USING (auth.uid() = author_id);

CREATE INDEX IF NOT EXISTS idx_bounty_status ON bounty_boards(status);
CREATE INDEX IF NOT EXISTS idx_bounty_problem ON bounty_boards(problem_id);

-- 3. SUDDEN DEATH SUBMISSIONS --------------------------------------
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
ALTER TABLE sudden_death_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_sudden_death" ON sudden_death_submissions;
CREATE POLICY "select_own_sudden_death" ON sudden_death_submissions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_sudden_death" ON sudden_death_submissions;
CREATE POLICY "insert_own_sudden_death" ON sudden_death_submissions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_sudden_death" ON sudden_death_submissions;
CREATE POLICY "update_own_sudden_death" ON sudden_death_submissions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_sudden_death_user ON sudden_death_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_sudden_death_problem ON sudden_death_submissions(problem_id);

-- 4. REVERSE ENGINEERING PROMPTS -----------------------------------
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
ALTER TABLE reverse_eng_prompts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_reverse_eng" ON reverse_eng_prompts;
CREATE POLICY "select_reverse_eng" ON reverse_eng_prompts FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_reverse_eng" ON reverse_eng_prompts;
CREATE POLICY "insert_own_reverse_eng" ON reverse_eng_prompts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "update_own_reverse_eng" ON reverse_eng_prompts;
CREATE POLICY "update_own_reverse_eng" ON reverse_eng_prompts FOR UPDATE
  TO authenticated USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "delete_own_reverse_eng" ON reverse_eng_prompts;
CREATE POLICY "delete_own_reverse_eng" ON reverse_eng_prompts FOR DELETE
  TO authenticated USING (auth.uid() = author_id);

CREATE INDEX IF NOT EXISTS idx_reverse_eng_status ON reverse_eng_prompts(status);
CREATE INDEX IF NOT EXISTS idx_reverse_eng_upvotes ON reverse_eng_prompts(upvotes);

-- 5. MEDIA ATTACHMENTS ---------------------------------------------
CREATE TABLE IF NOT EXISTS media_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('problem', 'solution', 'bounty', 'reverse_eng')),
  target_id text NOT NULL,
  media_type text NOT NULL CHECK (media_type IN ('image', 'video', 'link')),
  url text NOT NULL,
  caption text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE media_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_media" ON media_attachments;
CREATE POLICY "select_media" ON media_attachments FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_media" ON media_attachments;
CREATE POLICY "insert_own_media" ON media_attachments FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "delete_own_media" ON media_attachments;
CREATE POLICY "delete_own_media" ON media_attachments FOR DELETE
  TO authenticated USING (auth.uid() = owner_id);

CREATE INDEX IF NOT EXISTS idx_media_target ON media_attachments(target_type, target_id);

-- 6. EMAIL CONSENT -------------------------------------------------
CREATE TABLE IF NOT EXISTS email_consent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  consented boolean NOT NULL DEFAULT false,
  consented_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);
ALTER TABLE email_consent ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_consent" ON email_consent;
CREATE POLICY "select_own_consent" ON email_consent FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "upsert_own_consent" ON email_consent;
CREATE POLICY "upsert_own_consent" ON email_consent FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_consent" ON email_consent;
CREATE POLICY "update_own_consent" ON email_consent FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 7. AI TAG SUGGESTIONS --------------------------------------------
CREATE TABLE IF NOT EXISTS ai_tag_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id text NOT NULL,
  statement_hash text NOT NULL,
  suggested_tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (problem_id, statement_hash)
);
ALTER TABLE ai_tag_suggestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_ai_tags" ON ai_tag_suggestions;
CREATE POLICY "select_ai_tags" ON ai_tag_suggestions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_ai_tags" ON ai_tag_suggestions;
CREATE POLICY "insert_ai_tags" ON ai_tag_suggestions FOR INSERT
  TO anon, authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_ai_tags_problem ON ai_tag_suggestions(problem_id);
