/*
  # Add Super Admin Policies for Feedback Tables
  
  1. Changes
    - Add SELECT policy for super admins on user_feedback_submissions
    - Add SELECT policy for super admins on user_feedback_answers
    
  2. Security
    - Super admins can view ALL feedback across ALL teams
    - Uses existing is_super_admin() function to check permissions
*/

-- Allow super admins to view all feedback submissions
CREATE POLICY "Super admins can view all submissions"
  ON user_feedback_submissions
  FOR SELECT
  TO authenticated
  USING (is_super_admin());

-- Allow super admins to view all feedback answers
CREATE POLICY "Super admins can view all answers"
  ON user_feedback_answers
  FOR SELECT
  TO authenticated
  USING (is_super_admin());
