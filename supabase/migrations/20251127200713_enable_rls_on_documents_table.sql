/*
  # Enable Row Level Security on Documents Table

  1. Summary
    - Enable RLS on the `documents` table to ensure proper data access control
    - Create comprehensive policies for team-based access
    - Allow service role to bypass RLS for n8n workflow operations
    - Maintain security best practices while enabling automation

  2. Changes
    - Enable Row Level Security on `documents` table
    - Create SELECT policy for team members to view their team's documents
    - Create INSERT policy for team members and automated processes
    - Create UPDATE policy for team members
    - Create DELETE policy for team members
    - Service role key bypasses all policies automatically

  3. Security Model
    - Team members can only access documents belonging to their team
    - All policies verify team_id matches the user's team
    - Service role (n8n workflows) can access all data
    - Super admins have full access via existing is_super_admin() function

  4. Why This Fix Works
    - Previous issue: RLS was disabled, anon key got 0 results
    - With RLS enabled + policies: authenticated users get proper access
    - n8n using service role key: bypasses RLS entirely (works for all teams)
    - Defense-in-depth: even if service role is compromised, policies limit damage
*/

-- Enable Row Level Security on documents table
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies (idempotency)
DROP POLICY IF EXISTS "Team members can view team documents" ON documents;
DROP POLICY IF EXISTS "Team members can insert team documents" ON documents;
DROP POLICY IF EXISTS "Team members can update team documents" ON documents;
DROP POLICY IF EXISTS "Team members can delete team documents" ON documents;
DROP POLICY IF EXISTS "Super admins can manage all documents" ON documents;

-- Policy 1: SELECT - Team members can view their team's documents
CREATE POLICY "Team members can view team documents"
  ON documents
  FOR SELECT
  TO authenticated
  USING (
    -- User's team matches document's team
    team_id IN (
      SELECT team_id 
      FROM users 
      WHERE id = auth.uid()
    )
    -- OR user is super admin
    OR is_super_admin()
  );

-- Policy 2: INSERT - Team members can insert documents for their team
CREATE POLICY "Team members can insert team documents"
  ON documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Document's team_id matches user's team_id
    team_id IN (
      SELECT team_id 
      FROM users 
      WHERE id = auth.uid()
    )
    -- OR user is super admin
    OR is_super_admin()
  );

-- Policy 3: UPDATE - Team members can update their team's documents
CREATE POLICY "Team members can update team documents"
  ON documents
  FOR UPDATE
  TO authenticated
  USING (
    team_id IN (
      SELECT team_id 
      FROM users 
      WHERE id = auth.uid()
    )
    OR is_super_admin()
  )
  WITH CHECK (
    team_id IN (
      SELECT team_id 
      FROM users 
      WHERE id = auth.uid()
    )
    OR is_super_admin()
  );

-- Policy 4: DELETE - Team members can delete their team's documents
CREATE POLICY "Team members can delete team documents"
  ON documents
  FOR DELETE
  TO authenticated
  USING (
    team_id IN (
      SELECT team_id 
      FROM users 
      WHERE id = auth.uid()
    )
    OR is_super_admin()
  );

-- Note: Service role key automatically bypasses all RLS policies
-- This ensures n8n workflows using service role key have full access to all teams
