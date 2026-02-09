/*
  # Fix Super Admin RLS Policies - Final Version
  
  ## Overview
  Adds super admin RLS policies for admin dashboard access.
  
  ## Changes
  1. Create helper function to check super admin status
  2. Add super admin SELECT policies for core tables only
  
  ## Security
  - Only clay@rockethub.ai email can access all data
  - Read-only SELECT access for admin dashboard
*/

-- Drop any existing super admin policies
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE policyname ILIKE '%super admin%') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- Create or replace function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (SELECT email FROM auth.users WHERE id = auth.uid()) = 'clay@rockethub.ai';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION is_super_admin() TO authenticated;

-- Super admin policies for core tables
CREATE POLICY "Super admin can view all teams"
  ON teams FOR SELECT TO authenticated
  USING (is_super_admin());

CREATE POLICY "Super admin can view all users"
  ON users FOR SELECT TO authenticated
  USING (is_super_admin());

CREATE POLICY "Super admin can view all feedback submissions"
  ON user_feedback_submissions FOR SELECT TO authenticated
  USING (is_super_admin());

CREATE POLICY "Super admin can view all feedback answers"
  ON user_feedback_answers FOR SELECT TO authenticated
  USING (is_super_admin());

CREATE POLICY "Super admin can view all documents"
  ON documents FOR SELECT TO authenticated
  USING (is_super_admin());

CREATE POLICY "Super admin can view all feedback questions"
  ON feedback_questions FOR SELECT TO authenticated
  USING (is_super_admin());

CREATE POLICY "Super admin can view all chats"
  ON astra_chats FOR SELECT TO authenticated
  USING (is_super_admin());

CREATE POLICY "Super admin can view all reports"
  ON astra_reports FOR SELECT TO authenticated
  USING (is_super_admin());

CREATE POLICY "Super admin can view all gmail auth"
  ON gmail_auth FOR SELECT TO authenticated
  USING (is_super_admin());

CREATE POLICY "Super admin can view all drive connections"
  ON user_drive_connections FOR SELECT TO authenticated
  USING (is_super_admin());
