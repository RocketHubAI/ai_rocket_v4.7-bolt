/*
  # Allow Admins to Update Team Members

  1. Purpose
    - Allow team admins to update other team members' records
    - Enable role and permission management by admins

  2. Changes
    - Add new RLS policy for admins to update team members
    - Admins can only update members of their own team

  3. Security
    - Admins can only modify users in their team
    - Verification through user_metadata team_id and role
*/

-- Add policy for admins to update team members
DROP POLICY IF EXISTS "Admins can update team members" ON public.users;
CREATE POLICY "Admins can update team members"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (
    -- User must be an admin
    (auth.jwt()->'user_metadata'->>'role')::text = 'admin'
    -- Target user must be on the same team
    AND team_id = (auth.jwt()->'user_metadata'->>'team_id')::uuid
  )
  WITH CHECK (
    -- User must be an admin
    (auth.jwt()->'user_metadata'->>'role')::text = 'admin'
    -- Target user must remain on the same team (prevent moving users to other teams)
    AND team_id = (auth.jwt()->'user_metadata'->>'team_id')::uuid
  );
