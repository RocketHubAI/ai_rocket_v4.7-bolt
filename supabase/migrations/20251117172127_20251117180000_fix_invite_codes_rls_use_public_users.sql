/*
  # Fix Invite Codes RLS Policies to Use public.users Table

  ## Problem
  Team admins cannot create invite codes because RLS policies check auth.jwt()->user_metadata
  for role and team_id, but the system now stores this data in public.users table.

  ## Solution
  Update all team admin policies to query the public.users table instead of JWT metadata.

  ## Changes
  1. Drop existing team admin policies that use JWT metadata
  2. Create new policies that JOIN with public.users table
  3. Allow team admins to manage invite codes for their team
  4. Maintain super admin access

  ## Security
  - Team admins can only create/manage invite codes for their own team
  - Super admins retain full access
  - Anonymous users can still validate codes during signup
*/

-- Drop old team admin policies that use JWT metadata
DROP POLICY IF EXISTS "Team admins can view team invite codes" ON invite_codes;
DROP POLICY IF EXISTS "Team admins can create team invite codes" ON invite_codes;
DROP POLICY IF EXISTS "Team admins can update team invite codes" ON invite_codes;
DROP POLICY IF EXISTS "Team admins can delete team invite codes" ON invite_codes;

-- Policy: Team admins can view their team's invite codes
CREATE POLICY "Team admins can view team invite codes"
  ON invite_codes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.team_id = invite_codes.team_id
    )
  );

-- Policy: Team admins can create invite codes for their team
CREATE POLICY "Team admins can create team invite codes"
  ON invite_codes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.team_id = invite_codes.team_id
    )
  );

-- Policy: Team admins can update their team's invite codes
CREATE POLICY "Team admins can update team invite codes"
  ON invite_codes
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.team_id = invite_codes.team_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.team_id = invite_codes.team_id
    )
  );

-- Policy: Team admins can delete their team's invite codes
CREATE POLICY "Team admins can delete team invite codes"
  ON invite_codes
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.team_id = invite_codes.team_id
    )
  );

-- Create index on users(id, role, team_id) for better RLS policy performance
CREATE INDEX IF NOT EXISTS idx_users_id_role_team 
  ON users(id, role, team_id) 
  WHERE role = 'admin';
