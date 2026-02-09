/*
  # Add Super Admin Update Policy for Feedback Submissions

  ## Changes
  1. Add UPDATE policy for `user_feedback_submissions` table
     - Allows super admin to update feedback fields (status, not_resolved, etc.)
     - Uses `is_super_admin()` helper function

  ## Security
  - Only clay@rockethub.ai can update feedback submissions
  - Maintains data integrity by restricting updates to super admin only
*/

-- Add UPDATE policy for super admin on user_feedback_submissions
CREATE POLICY "Super admin can update all feedback submissions"
  ON user_feedback_submissions
  FOR UPDATE
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());
