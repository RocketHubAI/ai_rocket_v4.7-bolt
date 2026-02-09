/*
  # Add Super Admin Access to Setup Guide Progress

  1. Changes
    - Add SELECT policy for super admins to view all setup progress
    - Allows super admins (clay@rockethub.ai, derek@rockethub.ai, marshall@rockethub.ai) to view all user setup progress

  2. Security
    - Only specific super admin emails can access all setup progress data
    - Regular users can still only view their own progress
*/

-- Allow super admins to view all setup progress
CREATE POLICY "Super admins can view all setup progress"
  ON setup_guide_progress FOR SELECT
  TO authenticated
  USING (
    auth.jwt()->>'email' IN (
      'clay@rockethub.ai',
      'derek@rockethub.ai',
      'marshall@rockethub.ai'
    )
  );