-- Allow host to read profiles table
DROP POLICY IF EXISTS host_read_profiles ON profiles;
CREATE POLICY host_read_profiles ON profiles
  FOR SELECT TO authenticated
  USING (
    coalesce((current_setting('request.jwt.claims', true)::json ->> 'email'), '') IN ('miadayshaar2@gmail.com', 'audiaadya@gmail.com')
  );

-- Allow host to read solutions table  
DROP POLICY IF EXISTS host_read_solutions ON solutions;
CREATE POLICY host_read_solutions ON solutions
  FOR SELECT TO authenticated
  USING (
    coalesce((current_setting('request.jwt.claims', true)::json ->> 'email'), '') IN ('miadayshaar2@gmail.com', 'audiaadya@gmail.com')
    OR auth.uid() = author_id
  );

-- Allow host to read sudden_death_submissions
DROP POLICY IF EXISTS host_read_sudden_death ON sudden_death_submissions;
CREATE POLICY host_read_sudden_death ON sudden_death_submissions
  FOR SELECT TO authenticated
  USING (
    coalesce((current_setting('request.jwt.claims', true)::json ->> 'email'), '') IN ('miadayshaar2@gmail.com', 'audiaadya@gmail.com')
    OR auth.uid() = user_id
  );

-- Allow host to read bounty_boards
DROP POLICY IF EXISTS host_read_bounties ON bounty_boards;
CREATE POLICY host_read_bounties ON bounty_boards
  FOR SELECT TO authenticated
  USING (true);

-- Allow host to read reverse_eng_prompts
DROP POLICY IF EXISTS host_read_reverse_eng ON reverse_eng_prompts;
CREATE POLICY host_read_reverse_eng ON reverse_eng_prompts
  FOR SELECT TO authenticated
  USING (true);

-- Allow host to read proof_duels
DROP POLICY IF EXISTS host_read_duels ON proof_duels;
CREATE POLICY host_read_duels ON proof_duels
  FOR SELECT TO authenticated
  USING (true);

-- Allow host to read forum_threads
DROP POLICY IF EXISTS host_read_forum_threads ON forum_threads;
CREATE POLICY host_read_forum_threads ON forum_threads
  FOR SELECT TO authenticated
  USING (true);

-- Allow host to read forum_replies
DROP POLICY IF EXISTS host_read_forum_replies ON forum_replies;
CREATE POLICY host_read_forum_replies ON forum_replies
  FOR SELECT TO authenticated
  USING (true);

-- Ensure referral_source column exists on profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'referral_source'
  ) THEN
    ALTER TABLE profiles ADD COLUMN referral_source text;
  END IF;
END $$;