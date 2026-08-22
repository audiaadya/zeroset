/*
# ZeroSet — Advanced Features Schema

## Overview
Adds tables for:
1. Proof Duels - Head-to-head proof competitions
2. Skill Tree - Problem prerequisites and unlocking
3. Mock Sessions - Timed competition simulations
4. Problem Tags - Granular sub-field categorization
5. Draft Bench Sharing - Collaborative workspace sharing
6. Achievements - Tier-based mathematical titles

## Tables

### proof_duels
- `id` uuid PK
- `problem_id` text NOT NULL
- `challenger_id` uuid NOT NULL
- `challenger_name` text
- `challenger_solution` text
- `defender_id` uuid
- `defender_name` text
- `defender_solution` text
- `status` text DEFAULT 'open' CHECK (status IN ('open', 'matched', 'voting', 'completed', 'expired'))
- `winner_id` uuid
- `created_at` timestamptz
- `completed_at` timestamptz

### skill_nodes
- `id` uuid PK
- `title` text NOT NULL
- `description` text
- `subject` text NOT NULL — 'algebra', 'number_theory', 'combinatorics', 'geometry', 'analysis'
- `difficulty` text NOT NULL
- `order_index` int NOT NULL
- `required_xp` int DEFAULT 0
- `problem_ids` text[] — Array of problem IDs that satisfy this node

### skill_node_prerequisites
- `id` uuid PK
- `node_id` uuid REFERENCES skill_nodes(id) ON DELETE CASCADE
- `prerequisite_id` uuid REFERENCES skill_nodes(id) ON DELETE CASCADE
- UNIQUE (node_id, prerequisite_id)

### user_skill_progress
- `id` uuid PK
- `user_id` uuid NOT NULL DEFAULT auth.uid()
- `node_id` uuid REFERENCES skill_nodes(id) ON DELETE CASCADE
- `completed` boolean DEFAULT false
- `completed_at` timestamptz
- UNIQUE (user_id, node_id)

### mock_sessions
- `id` uuid PK
- `user_id` uuid NOT NULL DEFAULT auth.uid()
- `problem_ids` text[] NOT NULL
- `duration_minutes` int NOT NULL
- `started_at` timestamptz
- `ended_at` timestamptz
- `status` text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned'))
- `answers` jsonb — Store submitted answers

### problem_tags
- `id` uuid PK
- `problem_id` text NOT NULL
- `tag` text NOT NULL
- `created_at` timestamptz
- UNIQUE (problem_id, tag)

### shared_drafts
- `id` uuid PK
- `owner_id` uuid NOT NULL DEFAULT auth.uid()
- `access_key` text UNIQUE NOT NULL
- `title` text
- `content` text NOT NULL
- `expires_at` timestamptz
- `created_at` timestamptz

### user_achievements
- `id` uuid PK
- `user_id` uuid NOT NULL DEFAULT auth.uid()
- `achievement_id` text NOT NULL
- `earned_at` timestamptz NOT NULL DEFAULT now()
- UNIQUE (user_id, achievement_id)

### available_achievements (static reference)
Stored in code, not DB. Achievement IDs:
- 'novice_calculator', 'olympiad_contender', 'lemma_master', 'qed_architect'
- 'proof_duelist', 'streak_keeper', 'speed_demon', 'peer_reviewer'
*/

-- 1. PROOF DUELS ----------------------------------------------------
CREATE TABLE IF NOT EXISTS proof_duels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id text NOT NULL,
  challenger_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  challenger_name text NOT NULL,
  challenger_solution text,
  defender_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  defender_name text,
  defender_solution text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'matched', 'voting', 'completed', 'expired')),
  winner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  votes_challenger int DEFAULT 0,
  votes_defender int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
ALTER TABLE proof_duels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_duels" ON proof_duels;
CREATE POLICY "select_duels" ON proof_duels FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_duel" ON proof_duels;
CREATE POLICY "insert_own_duel" ON proof_duels FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = challenger_id);

DROP POLICY IF EXISTS "update_own_duel" ON proof_duels;
CREATE POLICY "update_own_duel" ON proof_duels FOR UPDATE
  TO authenticated USING (auth.uid() = challenger_id OR auth.uid() = defender_id);

-- 2. SKILL NODES ----------------------------------------------------
CREATE TABLE IF NOT EXISTS skill_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  subject text NOT NULL CHECK (subject IN ('algebra', 'number_theory', 'combinatorics', 'geometry', 'analysis', 'general')),
  difficulty text NOT NULL CHECK (difficulty IN ('Accessible', 'Intermediate', 'Advanced', 'Hard', 'Olympiad')),
  order_index int NOT NULL,
  required_xp int DEFAULT 0,
  problem_ids text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE skill_nodes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_skill_nodes" ON skill_nodes;
CREATE POLICY "select_skill_nodes" ON skill_nodes FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "manage_skill_nodes_host" ON skill_nodes;
CREATE POLICY "manage_skill_nodes_host" ON skill_nodes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
      AND u.email IN ('miadayshaar2@gmail.com')
    )
  );

-- 3. SKILL NODE PREREQUISITES ---------------------------------------
CREATE TABLE IF NOT EXISTS skill_node_prerequisites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id uuid NOT NULL REFERENCES skill_nodes(id) ON DELETE CASCADE,
  prerequisite_id uuid NOT NULL REFERENCES skill_nodes(id) ON DELETE CASCADE,
  UNIQUE (node_id, prerequisite_id)
);
ALTER TABLE skill_node_prerequisites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_prereqs" ON skill_node_prerequisites;
CREATE POLICY "select_prereqs" ON skill_node_prerequisites FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "manage_prereqs_host" ON skill_node_prerequisites;
CREATE POLICY "manage_prereqs_host" ON skill_node_prerequisites FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid()
      AND u.email IN ('miadayshaar2@gmail.com')
    )
  );

-- 4. USER SKILL PROGRESS --------------------------------------------
CREATE TABLE IF NOT EXISTS user_skill_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  node_id uuid NOT NULL REFERENCES skill_nodes(id) ON DELETE CASCADE,
  completed boolean DEFAULT false,
  completed_at timestamptz,
  UNIQUE (user_id, node_id)
);
ALTER TABLE user_skill_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_progress" ON user_skill_progress;
CREATE POLICY "select_own_progress" ON user_skill_progress FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_progress" ON user_skill_progress;
CREATE POLICY "insert_own_progress" ON user_skill_progress FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_progress" ON user_skill_progress;
CREATE POLICY "update_own_progress" ON user_skill_progress FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5. MOCK SESSIONS --------------------------------------------------
CREATE TABLE IF NOT EXISTS mock_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  problem_ids text[] NOT NULL,
  duration_minutes int NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  answers jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE mock_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_sessions" ON mock_sessions;
CREATE POLICY "select_own_sessions" ON mock_sessions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_session" ON mock_sessions;
CREATE POLICY "insert_own_session" ON mock_sessions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_session" ON mock_sessions;
CREATE POLICY "update_own_session" ON mock_sessions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 6. PROBLEM TAGS ---------------------------------------------------
CREATE TABLE IF NOT EXISTS problem_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id text NOT NULL,
  tag text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (problem_id, tag)
);
ALTER TABLE problem_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_tags" ON problem_tags;
CREATE POLICY "select_tags" ON problem_tags FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_tags" ON problem_tags;
CREATE POLICY "insert_tags" ON problem_tags FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "delete_tags" ON problem_tags;
CREATE POLICY "delete_tags" ON problem_tags FOR DELETE
  TO authenticated USING (true);

-- 7. SHARED DRAFTS --------------------------------------------------
CREATE TABLE IF NOT EXISTS shared_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  access_key text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex'),
  title text,
  content text NOT NULL,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE shared_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_shared_drafts" ON shared_drafts;
CREATE POLICY "select_shared_drafts" ON shared_drafts FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_draft" ON shared_drafts;
CREATE POLICY "insert_own_draft" ON shared_drafts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "delete_own_draft" ON shared_drafts;
CREATE POLICY "delete_own_draft" ON shared_drafts FOR DELETE
  TO authenticated USING (auth.uid() = owner_id);

-- 8. USER ACHIEVEMENTS ----------------------------------------------
CREATE TABLE IF NOT EXISTS user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id text NOT NULL,
  earned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, achievement_id)
);
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_achievements" ON user_achievements;
CREATE POLICY "select_achievements" ON user_achievements FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_achievement" ON user_achievements;
CREATE POLICY "insert_own_achievement" ON user_achievements FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- 9. DUEL VOTES -----------------------------------------------------
CREATE TABLE IF NOT EXISTS duel_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  duel_id uuid NOT NULL REFERENCES proof_duels(id) ON DELETE CASCADE,
  voter_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  vote_for uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (duel_id, voter_id)
);
ALTER TABLE duel_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_duel_votes" ON duel_votes;
CREATE POLICY "select_duel_votes" ON duel_votes FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_duel_vote" ON duel_votes;
CREATE POLICY "insert_own_duel_vote" ON duel_votes FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = voter_id);

-- 10. INDEXES -------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_duels_status ON proof_duels(status);
CREATE INDEX IF NOT EXISTS idx_duels_challenger ON proof_duels(challenger_id);
CREATE INDEX IF NOT EXISTS idx_skill_nodes_subject ON skill_nodes(subject);
CREATE INDEX IF NOT EXISTS idx_user_progress_user ON user_skill_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_mock_sessions_user ON mock_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_problem_tags_tag ON problem_tags(tag);
CREATE INDEX IF NOT EXISTS idx_shared_drafts_key ON shared_drafts(access_key);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_duel_votes_duel ON duel_votes(duel_id);