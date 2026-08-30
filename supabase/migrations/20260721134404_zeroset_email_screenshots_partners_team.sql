-- Add email column to profiles + backfill from auth.users
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email text;

UPDATE profiles p
SET email = u.email
FROM auth.users u
WHERE p.user_id = u.id
  AND p.email IS NULL
  AND u.email IS NOT NULL;

-- week_screenshots table
CREATE TABLE IF NOT EXISTS week_screenshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id uuid NOT NULL,
  image_url text NOT NULL,
  caption text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE week_screenshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_week_screenshots" ON week_screenshots;
CREATE POLICY "select_week_screenshots" ON week_screenshots FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_week_screenshots" ON week_screenshots;
CREATE POLICY "insert_week_screenshots" ON week_screenshots FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_week_screenshots" ON week_screenshots;
CREATE POLICY "update_week_screenshots" ON week_screenshots FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_week_screenshots" ON week_screenshots;
CREATE POLICY "delete_week_screenshots" ON week_screenshots FOR DELETE
  TO authenticated USING (true);

-- Storage bucket for week screenshots
INSERT INTO storage.buckets (id, name, public)
VALUES ('week-screenshots', 'week-screenshots', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read week-screenshots" ON storage.objects;
CREATE POLICY "Public read week-screenshots" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'week-screenshots');

DROP POLICY IF EXISTS "Authed upload week-screenshots" ON storage.objects;
CREATE POLICY "Authed upload week-screenshots" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'week-screenshots');

DROP POLICY IF EXISTS "Authed update week-screenshots" ON storage.objects;
CREATE POLICY "Authed update week-screenshots" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'week-screenshots');

DROP POLICY IF EXISTS "Authed delete week-screenshots" ON storage.objects;
CREATE POLICY "Authed delete week-screenshots" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'week-screenshots');

-- partners table
CREATE TABLE IF NOT EXISTS partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  image_url text,
  link_url text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE partners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_partners" ON partners;
CREATE POLICY "select_partners" ON partners FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_partners" ON partners;
CREATE POLICY "insert_partners" ON partners FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_partners" ON partners;
CREATE POLICY "update_partners" ON partners FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_partners" ON partners;
CREATE POLICY "delete_partners" ON partners FOR DELETE
  TO authenticated USING (true);

-- Storage bucket metadata read policy
DROP POLICY IF EXISTS "Anyone can read bucket metadata" ON storage.buckets;
CREATE POLICY "Anyone can read bucket metadata"
  ON storage.buckets FOR SELECT
  TO anon, authenticated
  USING (true);

-- staff_pick and trending_score on week_sets
ALTER TABLE week_sets
  ADD COLUMN IF NOT EXISTS staff_pick boolean NOT NULL DEFAULT false;

ALTER TABLE week_sets
  ADD COLUMN IF NOT EXISTS trending_score int NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_week_sets_staff_pick ON week_sets(staff_pick)
  WHERE staff_pick = true;
CREATE INDEX IF NOT EXISTS idx_week_sets_trending ON week_sets(trending_score DESC);

-- bump_trending_score RPC
CREATE OR REPLACE FUNCTION bump_trending_score(p_set_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE week_sets
  SET trending_score = trending_score + 1,
      updated_at = now()
  WHERE id = p_set_id
    AND scope = 'community'
    AND status = 'published';
$$;

GRANT EXECUTE ON FUNCTION bump_trending_score(uuid) TO anon, authenticated;

-- Partners storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('partners', 'partners', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read partners" ON storage.objects;
CREATE POLICY "Public read partners" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'partners');

DROP POLICY IF EXISTS "Authed upload partners" ON storage.objects;
CREATE POLICY "Authed upload partners" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'partners');

DROP POLICY IF EXISTS "Authed update partners" ON storage.objects;
CREATE POLICY "Authed update partners" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'partners');

DROP POLICY IF EXISTS "Authed delete partners" ON storage.objects;
CREATE POLICY "Authed delete partners" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'partners');

-- ── team_members ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE,
  full_name text,
  role text NOT NULL DEFAULT 'member',
  assigned_set text,
  invited_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_team_members" ON team_members;
CREATE POLICY "select_team_members" ON team_members FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_team_member" ON team_members;
CREATE POLICY "insert_own_team_member" ON team_members FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "admin_update_team_members" ON team_members;
CREATE POLICY "admin_update_team_members" ON team_members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.user_id = auth.uid() AND tm.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.user_id = auth.uid() AND tm.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "admin_delete_team_members" ON team_members;
CREATE POLICY "admin_delete_team_members" ON team_members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.user_id = auth.uid() AND tm.role = 'admin'
    )
  );

-- ── team_invitations ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS team_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  role text NOT NULL,
  assigned_set text,
  invited_by uuid REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_select_invitations" ON team_invitations;
CREATE POLICY "admin_select_invitations" ON team_invitations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.user_id = auth.uid() AND tm.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "admin_insert_invitations" ON team_invitations;
CREATE POLICY "admin_insert_invitations" ON team_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.user_id = auth.uid() AND tm.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "admin_update_invitations" ON team_invitations;
CREATE POLICY "admin_update_invitations" ON team_invitations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.user_id = auth.uid() AND tm.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.user_id = auth.uid() AND tm.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "admin_delete_invitations" ON team_invitations;
CREATE POLICY "admin_delete_invitations" ON team_invitations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.user_id = auth.uid() AND tm.role = 'admin'
    )
  );

-- Seed the first admin
DO $$
BEGIN
  INSERT INTO team_members (email, role, full_name)
  VALUES ('miadayshaar2@gmail.com', 'admin', 'audi.aadya')
  ON CONFLICT (email) DO UPDATE
    SET role = 'admin',
        updated_at = now();
END $$;

-- Self-link seed team member policy
DROP POLICY IF EXISTS "self_link_seed_team_member" ON team_members;
CREATE POLICY "self_link_seed_team_member" ON team_members FOR UPDATE
  TO authenticated
  USING (
    user_id IS NULL
    AND email IS NOT NULL
    AND lower(email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
  )
  WITH CHECK (
    user_id = auth.uid()
  );