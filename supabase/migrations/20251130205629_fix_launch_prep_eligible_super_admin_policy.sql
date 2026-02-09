/*
  # Fix Launch Preparation Eligible Users Super Admin Policy

  1. Changes
    - Drop the existing super admin policy that tries to query auth.users (causes permission error)
    - Create a new super admin policy that uses public.users table instead
  
  2. Security
    - Only super admins can INSERT/UPDATE/DELETE eligible users
    - All authenticated users can SELECT (already fixed in previous migration)
*/

-- Drop the problematic super admin policy
DROP POLICY IF EXISTS "Super admins can manage eligible users" ON launch_preparation_eligible_users;

-- Create a new super admin policy using public.users instead of auth.users
CREATE POLICY "Super admins can manage eligible users"
  ON launch_preparation_eligible_users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.email IN ('clay@rockethub.co', 'claytondipani@gmail.com', 'mattpugh22@gmail.com')
    )
  );