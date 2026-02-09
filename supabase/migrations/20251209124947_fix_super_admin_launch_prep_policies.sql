/*
  # Fix Super Admin Launch Prep Policies
  
  1. Changes
    - Drop the broken policies that reference auth.users incorrectly
    - Update is_super_admin() function to include all three admin emails
    - Recreate policies using the is_super_admin() function
  
  2. Security
    - Super admins can view all launch preparation data
    - Regular users can still only see their own data
*/

-- Drop the problematic policies
DROP POLICY IF EXISTS "Super admins can view all launch status" ON user_launch_status;
DROP POLICY IF EXISTS "Super admins can view all progress" ON launch_preparation_progress;
DROP POLICY IF EXISTS "Super admins can view all points ledger" ON launch_points_ledger;
DROP POLICY IF EXISTS "Super admins can view all eligible users" ON launch_preparation_eligible_users;

-- Update is_super_admin function to include all three admin emails
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_email TEXT;
BEGIN
  SELECT email INTO user_email FROM auth.users WHERE id = auth.uid();
  RETURN user_email IN ('clay@rockethub.ai', 'derek@rockethub.ai', 'marshall@rockethub.ai');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate policies using the is_super_admin() function

-- User Launch Status: Super admins can view all launch status
CREATE POLICY "Super admins can view all launch status"
  ON user_launch_status
  FOR SELECT
  TO authenticated
  USING (is_super_admin());

-- Launch Preparation Progress: Super admins can view all progress
CREATE POLICY "Super admins can view all progress"
  ON launch_preparation_progress
  FOR SELECT
  TO authenticated
  USING (is_super_admin());

-- Launch Points Ledger: Super admins can view all points
CREATE POLICY "Super admins can view all points ledger"
  ON launch_points_ledger
  FOR SELECT
  TO authenticated
  USING (is_super_admin());

-- Launch Preparation Eligible Users: Super admins can view all eligible users
CREATE POLICY "Super admins can view all eligible users"
  ON launch_preparation_eligible_users
  FOR SELECT
  TO authenticated
  USING (is_super_admin());