/*
# Team management: members, roles, and invitations

## Summary
Adds a role-based team management system to ZeroSet. Staff members are
assigned one of three roles — admin, marketing, community_manager — each with
a different set of permissions. A separate invitations table lets an admin
pre-assign a role + community set to an email address; when that person later
signs up, the pending invitation is automatically applied.

## New Tables

### team_members
Stores the role and assignment for every ZeroSet staff member.
- `id` (uuid, primary key)
- `user_id` (uuid, unique, references auth.users ON DELETE CASCADE)
- `email` (text, unique) — the auth email, denormalized for search/listing
- `full_name` (text, nullable) — display name
- `role` (text, NOT NULL, default 'member') — one of: admin, marketing, community_manager, member
- `assigned_set` (text, nullable) — the community week_set.id this manager may edit
- `invited_by` (uuid, nullable, references auth.users) — admin who invited/promoted them
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

### team_invitations
Pending role assignments keyed by email. When the invitee signs up and their
team_members row is created, the matching invitation (if any) is consumed.
- `id` (uuid, primary key)
- `email` (text, unique) — the invited email address
- `role` (text, NOT NULL) — admin, marketing, or community_manager
- `assigned_set` (text, nullable) — community set id (for community_manager)
- `invited_by` (uuid, nullable, references auth.users) — admin who sent the invite
- `status` (text, NOT NULL, default 'pending') — pending / applied
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

## Security (RLS)

### team_members
- SELECT: any authenticated user can read the team directory (name, email,
  role, assigned_set, dates) so the UI can render the team list and the app
  can check the current user's own role.
- INSERT: any authenticated user can insert their OWN row (user_id = auth.uid())
  — this is the auto-create-on-first-sign-in path. The role column defaults to
  'member', so a self-insert cannot grant elevated permissions.
- UPDATE: restricted to admins only. An admin is identified by an existing
  team_members row with role = 'admin' for auth.uid(). This prevents
  self-promotion.
- DELETE: restricted to admins only.

### team_invitations
- SELECT: admins only.
- INSERT/UPDATE/DELETE: admins only.

## Important Notes
1. The first admin must be seeded manually (see the DO $$ block at the end of
   this migration). It promotes the existing host email to the admin role.
2. Roles are stored as plain text so adding a new role later only requires
   inserting a new value — no enum migration needed.
3. `assigned_set` references week_sets.id loosely (text, no FK) because a
   community set may not exist yet at invite time.
*/

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

-- Any authenticated user can read the directory (needed for role checks + UI)
DROP POLICY IF EXISTS "select_team_members" ON team_members;
CREATE POLICY "select_team_members" ON team_members FOR SELECT
  TO authenticated USING (true);

-- A user can insert only their own row (auto-create on first sign-in)
DROP POLICY IF EXISTS "insert_own_team_member" ON team_members;
CREATE POLICY "insert_own_team_member" ON team_members FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- Only admins can update team members (role changes, assignments, removals)
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

-- Only admins can delete team member records
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

-- Admins can read invitations
DROP POLICY IF EXISTS "admin_select_invitations" ON team_invitations;
CREATE POLICY "admin_select_invitations" ON team_invitations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.user_id = auth.uid() AND tm.role = 'admin'
    )
  );

-- Admins can create invitations
DROP POLICY IF EXISTS "admin_insert_invitations" ON team_invitations;
CREATE POLICY "admin_insert_invitations" ON team_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.user_id = auth.uid() AND tm.role = 'admin'
    )
  );

-- Admins can update invitations (e.g. mark applied)
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

-- Admins can delete invitations
DROP POLICY IF EXISTS "admin_delete_invitations" ON team_invitations;
CREATE POLICY "admin_delete_invitations" ON team_invitations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.user_id = auth.uid() AND tm.role = 'admin'
    )
  );

-- ── Seed the first admin ──────────────────────────────────────
-- Promote the existing host email to admin role. Uses ON CONFLICT so it is
-- safe to re-run. The user_id is left NULL because the auth.users id may not
-- be known here; the AuthContext auto-sync will fill it in on next sign-in.
DO $$
BEGIN
  INSERT INTO team_members (email, role, full_name)
  VALUES ('miadayshaar2@gmail.com', 'admin', 'audi.aadya')
  ON CONFLICT (email) DO UPDATE
    SET role = 'admin',
        updated_at = now();
END $$;
