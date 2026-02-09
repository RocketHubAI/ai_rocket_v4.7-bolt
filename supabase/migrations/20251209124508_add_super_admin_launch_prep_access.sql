/*
  # Add Super Admin Access to Launch Preparation Tables
  
  1. Changes
    - Add SELECT policies for super admins on all launch preparation tables
    - Super admins can view all users' launch preparation data
  
  2. Security
    - Only applies to clay@rockethub.ai, derek@rockethub.ai, and marshall@rockethub.ai
    - Does not grant write access, only read access for dashboard viewing
*/

-- User Launch Status: Super admins can view all launch status
CREATE POLICY "Super admins can view all launch status"
  ON user_launch_status
  FOR SELECT
  TO authenticated
  USING (
    (SELECT email FROM auth.users WHERE id = auth.uid()) IN (
      'clay@rockethub.ai',
      'derek@rockethub.ai',
      'marshall@rockethub.ai'
    )
  );

-- Launch Preparation Progress: Super admins can view all progress
CREATE POLICY "Super admins can view all progress"
  ON launch_preparation_progress
  FOR SELECT
  TO authenticated
  USING (
    (SELECT email FROM auth.users WHERE id = auth.uid()) IN (
      'clay@rockethub.ai',
      'derek@rockethub.ai',
      'marshall@rockethub.ai'
    )
  );

-- Launch Points Ledger: Super admins can view all points
CREATE POLICY "Super admins can view all points ledger"
  ON launch_points_ledger
  FOR SELECT
  TO authenticated
  USING (
    (SELECT email FROM auth.users WHERE id = auth.uid()) IN (
      'clay@rockethub.ai',
      'derek@rockethub.ai',
      'marshall@rockethub.ai'
    )
  );

-- Launch Preparation Eligible Users: Super admins can view all eligible users
CREATE POLICY "Super admins can view all eligible users"
  ON launch_preparation_eligible_users
  FOR SELECT
  TO authenticated
  USING (
    (SELECT email FROM auth.users WHERE id = auth.uid()) IN (
      'clay@rockethub.ai',
      'derek@rockethub.ai',
      'marshall@rockethub.ai'
    )
  );