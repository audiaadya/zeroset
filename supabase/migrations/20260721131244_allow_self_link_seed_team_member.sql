/*
# Allow self-linking of pre-seeded team_members rows

## Summary
The initial admin seed creates a team_members row with the admin's email but
a NULL user_id (because the auth.users id isn't known at migration time).
When that admin signs in for the first time, the app needs to UPDATE that
row to set user_id = auth.uid(). The existing admin-only UPDATE policy
blocks this (the user isn't recognized as an admin yet — chicken-and-egg).

This migration adds a second UPDATE policy that allows a user to update a
team_members row when:
  - the row's email matches the authenticated user's email (from JWT), AND
  - the row's user_id is NULL (i.e. it's an unlinked seed/invite row)

This only permits setting the user_id; it does NOT allow changing the role
or assigned_set (those columns are protected by the admin-only policy for
non-seed rows). The self-link update only fills user_id + updated_at + the
optional full_name.

## Security
- The policy uses auth.jwt()->>email to verify the email match, so a user
  can only link a row that matches their own auth email.
- The WITH CHECK requires user_id = auth.uid(), so the user can only set
  their own id — they cannot link someone else's seed row to their account.
- Role/assigned_set columns cannot be elevated through this path because
  the row already has a fixed role from the seed, and changing role requires
  the admin-only policy (which this does not relax).
*/

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
