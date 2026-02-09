/*
  # Fix Launch Achievements RLS Policy

  1. Changes
    - Drop the existing super admin policy that tries to query auth.users (causes permission error)
    - Create a new super admin policy that uses public.users table instead
    - This fixes the permission denied error that was blocking all SELECT queries
  
  2. Security
    - Authenticated users can SELECT active achievements (existing policy)
    - Only super admins can INSERT/UPDATE/DELETE achievements
*/

-- Drop the problematic super admin policy
DROP POLICY IF EXISTS "Super admins can manage achievements" ON launch_achievements;

-- Create a new super admin policy using public.users instead of auth.users
CREATE POLICY "Super admins can manage achievements"
  ON launch_achievements
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.email IN ('clay@rockethub.co', 'claytondipani@gmail.com', 'mattpugh22@gmail.com')
    )
  );