/*
# Add tanvi as community manager + create Solvefire Official set

1. Schema Changes
- ALTER week_sets.owner_id to be nullable. Official sets created by the host
  before any auth user exists (or community-managed sets) don't need a
  specific owner. This is safe — making a column nullable never loses data.

2. New Data
- Create a `week_sets` row titled "Solvefire Official" with scope 'official'.
- Pre-create a `team_members` row for chulakitanvi@gmail.com with role
  'community_manager' and assigned_set pointing to the Solvefire Official set.
  user_id is NULL until tanvi registers; the self_link_seed_team_member
  policy will populate user_id automatically on her first sign-in.
- Upsert a `team_invitations` row (status 'applied') so the assignment
  is tracked in the invitations list.

3. Security
- No RLS policy changes. The team_members insert runs via service role
  (this migration), bypassing RLS. The existing self_link UPDATE policy
  will link user_id when tanvi signs up with chulakitanvi@gmail.com.

4. Important Notes
- Tanvi must register with email chulakitanvi@gmail.com to activate her
  account. On first sign-in, her user_id will be auto-linked to the
  pre-seeded team_members row.
- The Solvefire Official set appears in the Team Management "Community Set"
  dropdown because it has scope='official'.
*/

-- 1. Make owner_id nullable so official sets can exist without an auth user
ALTER TABLE week_sets ALTER COLUMN owner_id DROP NOT NULL;

-- 2. Create the Solvefire Official week set (idempotent)
INSERT INTO week_sets (owner_id, owner_name, scope, status, title, umbrella, description, week_number, created_at, updated_at)
VALUES (
  NULL,
  'audi.aadya',
  'official',
  'published',
  'Solvefire Official',
  'Solvefire',
  'The official Solvefire weekly problem set. Assigned to the community manager for editing.',
  1,
  now(),
  now()
)
ON CONFLICT DO NOTHING;

-- 3. Upsert tanvi's team_members row + invitation
DO $$
DECLARE
  set_id uuid;
BEGIN
  SELECT id INTO set_id FROM week_sets WHERE title = 'Solvefire Official' LIMIT 1;
  IF set_id IS NULL THEN
    RETURN;
  END IF;

  -- Pre-seed tanvi as community_manager (user_id NULL until she registers)
  INSERT INTO team_members (user_id, email, full_name, role, assigned_set, invited_by, created_at, updated_at)
  VALUES (
    NULL,
    'chulakitanvi@gmail.com',
    'tanvi',
    'community_manager',
    set_id,
    NULL,
    now(),
    now()
  )
  ON CONFLICT (email) DO UPDATE
  SET role = 'community_manager',
      full_name = 'tanvi',
      assigned_set = set_id,
      updated_at = now();

  -- Track the assignment as an applied invitation
  INSERT INTO team_invitations (email, role, assigned_set, invited_by, status, created_at, updated_at)
  VALUES (
    'chulakitanvi@gmail.com',
    'community_manager',
    set_id,
    NULL,
    'applied',
    now(),
    now()
  )
  ON CONFLICT (email) DO UPDATE
  SET role = 'community_manager',
      assigned_set = set_id,
      status = 'applied',
      updated_at = now();
END $$;
