/*
  # Revert SELECT-only Super Admin RLS Policies
  
  ## Overview
  Removes the SELECT-only RLS policies that are interfering with normal operations.
  
  ## Changes
  - Drop all super admin SELECT policies
  - Keep the super admin check function for potential future use
*/

-- Drop all super admin SELECT policies
DROP POLICY IF EXISTS "Super admin can view all users" ON users;
DROP POLICY IF EXISTS "Super admin can view all teams" ON teams;
DROP POLICY IF EXISTS "Super admin can view all documents" ON documents;
DROP POLICY IF EXISTS "Super admin can view all chats" ON astra_chats;
DROP POLICY IF EXISTS "Super admin can view all reports" ON astra_reports;
DROP POLICY IF EXISTS "Super admin can view all gmail connections" ON gmail_auth;
DROP POLICY IF EXISTS "Super admin can view all drive connections" ON user_drive_connections;
DROP POLICY IF EXISTS "Super admin can view all feedback" ON user_feedback_submissions;
DROP POLICY IF EXISTS "Super admin can view all feedback answers" ON user_feedback_answers;
DROP POLICY IF EXISTS "Super admin can view all feedback questions" ON feedback_questions;
DROP POLICY IF EXISTS "Super admin can view all team settings" ON team_settings;
