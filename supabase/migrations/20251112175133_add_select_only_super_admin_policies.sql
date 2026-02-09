/*
  # Add SELECT-only Super Admin RLS Policies
  
  ## Overview
  Adds RLS policies that allow clay@rockethub.ai to SELECT from all tables
  needed for the Admin Dashboard. These policies are ONLY for SELECT operations
  and don't affect INSERT, UPDATE, or DELETE operations.
  
  ## Changes
  - Create helper function to check if user is super admin
  - Add SELECT-only policies for admin dashboard tables
  
  ## Security
  - Only applies to SELECT operations
  - Only for clay@rockethub.ai email
  - Doesn't interfere with existing RLS policies
*/

-- Create super admin check function
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (SELECT email FROM auth.users WHERE id = auth.uid()) = 'clay@rockethub.ai';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Users table - Super admin can view all users
CREATE POLICY "Super admin can view all users"
  ON users
  FOR SELECT
  TO authenticated
  USING (is_super_admin());

-- Teams table - Super admin can view all teams
CREATE POLICY "Super admin can view all teams"
  ON teams
  FOR SELECT
  TO authenticated
  USING (is_super_admin());

-- Documents table - Super admin can view all documents
CREATE POLICY "Super admin can view all documents"
  ON documents
  FOR SELECT
  TO authenticated
  USING (is_super_admin());

-- Astra chats table - Super admin can view all chats
CREATE POLICY "Super admin can view all chats"
  ON astra_chats
  FOR SELECT
  TO authenticated
  USING (is_super_admin());

-- Astra reports table - Super admin can view all reports
CREATE POLICY "Super admin can view all reports"
  ON astra_reports
  FOR SELECT
  TO authenticated
  USING (is_super_admin());

-- Gmail auth table - Super admin can view all gmail connections
CREATE POLICY "Super admin can view all gmail connections"
  ON gmail_auth
  FOR SELECT
  TO authenticated
  USING (is_super_admin());

-- User drive connections table - Super admin can view all drive connections
CREATE POLICY "Super admin can view all drive connections"
  ON user_drive_connections
  FOR SELECT
  TO authenticated
  USING (is_super_admin());

-- User feedback submissions table - Super admin can view all feedback
CREATE POLICY "Super admin can view all feedback"
  ON user_feedback_submissions
  FOR SELECT
  TO authenticated
  USING (is_super_admin());

-- User feedback answers table - Super admin can view all feedback answers
CREATE POLICY "Super admin can view all feedback answers"
  ON user_feedback_answers
  FOR SELECT
  TO authenticated
  USING (is_super_admin());

-- Feedback questions table - Super admin can view all questions
CREATE POLICY "Super admin can view all feedback questions"
  ON feedback_questions
  FOR SELECT
  TO authenticated
  USING (is_super_admin());

-- Team settings table - Super admin can view all team settings
CREATE POLICY "Super admin can view all team settings"
  ON team_settings
  FOR SELECT
  TO authenticated
  USING (is_super_admin());
