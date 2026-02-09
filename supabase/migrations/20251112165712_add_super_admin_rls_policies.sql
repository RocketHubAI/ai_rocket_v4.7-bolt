/*
  # Add Super Admin RLS Policies
  
  ## Overview
  Adds RLS policies to allow super admin (clay@rockethub.ai) to access all data
  across teams, users, feedback, and support messages for the admin dashboard.
  
  ## Changes
  1. Add super admin policy to teams table
  2. Add super admin policy to users table  
  3. Add super admin policy to user_feedback_submissions table
  4. Add super admin policy to user_feedback_answers table
  5. Add super admin policy to documents table
  
  ## Security
  - Policies only allow access to clay@rockethub.ai email
  - Does not affect existing user/admin policies
  - Read-only access for dashboard purposes
*/

-- Super admin can view all teams
CREATE POLICY "Super admin can view all teams"
  ON teams
  FOR SELECT
  TO authenticated
  USING (
    (SELECT email FROM auth.users WHERE id = auth.uid()) = 'clay@rockethub.ai'
  );

-- Super admin can view all users
CREATE POLICY "Super admin can view all users"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    (SELECT email FROM auth.users WHERE id = auth.uid()) = 'clay@rockethub.ai'
  );

-- Super admin can view all feedback submissions
CREATE POLICY "Super admin can view all feedback"
  ON user_feedback_submissions
  FOR SELECT
  TO authenticated
  USING (
    (SELECT email FROM auth.users WHERE id = auth.uid()) = 'clay@rockethub.ai'
  );

-- Super admin can view all feedback answers
CREATE POLICY "Super admin can view all answers"
  ON user_feedback_answers
  FOR SELECT
  TO authenticated
  USING (
    (SELECT email FROM auth.users WHERE id = auth.uid()) = 'clay@rockethub.ai'
  );

-- Super admin can view all documents
CREATE POLICY "Super admin can view all documents"
  ON documents
  FOR SELECT
  TO authenticated
  USING (
    (SELECT email FROM auth.users WHERE id = auth.uid()) = 'clay@rockethub.ai'
  );
