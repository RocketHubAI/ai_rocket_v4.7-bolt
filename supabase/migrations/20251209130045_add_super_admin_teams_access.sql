/*
  # Add Super Admin Teams Access
  
  1. Changes
    - Add policy allowing super admins to view all teams
  
  2. Security
    - Super admins (clay@, derek@, marshall@) can view all teams for admin dashboard
    - Regular users can still only see their own team
*/

-- Add super admin policy for teams table
CREATE POLICY "Super admins can view all teams"
  ON teams
  FOR SELECT
  TO authenticated
  USING (is_super_admin());