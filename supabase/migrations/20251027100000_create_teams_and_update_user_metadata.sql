/*
  # Create Teams System and Update User Metadata

  1. New Tables
    - `teams`
      - `id` (uuid, primary key) - Unique identifier for the team
      - `name` (text) - Team name (company, project, group, etc.)
      - `created_at` (timestamptz) - When the team was created
      - `created_by` (uuid) - Reference to auth.users who created the team
      - `updated_at` (timestamptz) - Last update timestamp

  2. User Metadata Updates
    - Add to auth.users.raw_user_meta_data:
      - `team_id` (uuid) - Reference to teams table
      - `role` (text) - User role: 'admin' or 'member'
      - `full_name` (text) - User's full name
      - `view_financial` (boolean) - Whether user can view financial data (default true)

  3. Invite Codes Updates
    - Add `team_id` column to associate invite with team
    - Add `invited_email` column to restrict code to specific email
    - Add `assigned_role` column to pre-assign role ('admin' or 'member')
    - Add `view_financial` column for permission preset

  4. Document Chunks Updates
    - Add `team_id` to document_chunks_financial, document_chunks_strategy, document_chunks_meetings
    - Keep user_id in company_emails (emails remain user-specific)

  5. Security
    - Enable RLS on teams table
    - Add policies for team members to view their team
    - Add policies for admins to manage their team
    - Update invite_codes policies for team-based access
    - Update document_chunks policies for team-based access

  6. Data Migration
    - Create RocketHub team
    - Assign existing 5 users to RocketHub team with appropriate roles
*/

-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on teams
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Team members can view their team" ON teams;
DROP POLICY IF EXISTS "Team admins can update their team" ON teams;
DROP POLICY IF EXISTS "Authenticated users can create teams" ON teams;

-- Policy: Team members can view their own team
CREATE POLICY "Team members can view their team"
  ON teams
  FOR SELECT
  TO authenticated
  USING (
    id = (auth.jwt()->'user_metadata'->>'team_id')::uuid
  );

-- Policy: Team admins can update their team
CREATE POLICY "Team admins can update their team"
  ON teams
  FOR UPDATE
  TO authenticated
  USING (
    id = (auth.jwt()->'user_metadata'->>'team_id')::uuid
    AND (auth.jwt()->'user_metadata'->>'role')::text = 'admin'
  )
  WITH CHECK (
    id = (auth.jwt()->'user_metadata'->>'team_id')::uuid
    AND (auth.jwt()->'user_metadata'->>'role')::text = 'admin'
  );

-- Policy: Authenticated users can create teams (for onboarding)
CREATE POLICY "Authenticated users can create teams"
  ON teams
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add team_id and other columns to invite_codes
ALTER TABLE invite_codes ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES teams(id) ON DELETE CASCADE;
ALTER TABLE invite_codes ADD COLUMN IF NOT EXISTS invited_email text;
ALTER TABLE invite_codes ADD COLUMN IF NOT EXISTS assigned_role text DEFAULT 'member' CHECK (assigned_role IN ('admin', 'member'));
ALTER TABLE invite_codes ADD COLUMN IF NOT EXISTS view_financial boolean DEFAULT true;

-- Add team_id to document_chunks tables (except company_emails which remain user-specific)
ALTER TABLE document_chunks_financial ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES teams(id) ON DELETE CASCADE;
ALTER TABLE document_chunks_strategy ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES teams(id) ON DELETE CASCADE;
ALTER TABLE document_chunks_meetings ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES teams(id) ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_teams_created_by ON teams(created_by);
CREATE INDEX IF NOT EXISTS idx_invite_codes_team_id ON invite_codes(team_id);
CREATE INDEX IF NOT EXISTS idx_invite_codes_invited_email ON invite_codes(invited_email);
CREATE INDEX IF NOT EXISTS idx_document_chunks_financial_team_id ON document_chunks_financial(team_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_strategy_team_id ON document_chunks_strategy(team_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_meetings_team_id ON document_chunks_meetings(team_id);

-- Update RLS policies for invite_codes to include team-based access
DROP POLICY IF EXISTS "Super-admins can view all invite codes" ON invite_codes;
DROP POLICY IF EXISTS "Super-admins can create invite codes" ON invite_codes;
DROP POLICY IF EXISTS "Super-admins can update invite codes" ON invite_codes;
DROP POLICY IF EXISTS "Super-admins can delete invite codes" ON invite_codes;
DROP POLICY IF EXISTS "Team admins can view team invite codes" ON invite_codes;
DROP POLICY IF EXISTS "Team admins can create team invite codes" ON invite_codes;
DROP POLICY IF EXISTS "Team admins can update team invite codes" ON invite_codes;
DROP POLICY IF EXISTS "Team admins can delete team invite codes" ON invite_codes;

-- Policy: Team admins can view invite codes for their team
CREATE POLICY "Team admins can view team invite codes"
  ON invite_codes
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->'user_metadata'->>'role')::text = 'admin'
    AND team_id = (auth.jwt()->'user_metadata'->>'team_id')::uuid
  );

-- Policy: Team admins can create invite codes for their team
CREATE POLICY "Team admins can create team invite codes"
  ON invite_codes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt()->'user_metadata'->>'role')::text = 'admin'
    AND team_id = (auth.jwt()->'user_metadata'->>'team_id')::uuid
  );

-- Policy: Team admins can update invite codes for their team
CREATE POLICY "Team admins can update team invite codes"
  ON invite_codes
  FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt()->'user_metadata'->>'role')::text = 'admin'
    AND team_id = (auth.jwt()->'user_metadata'->>'team_id')::uuid
  )
  WITH CHECK (
    (auth.jwt()->'user_metadata'->>'role')::text = 'admin'
    AND team_id = (auth.jwt()->'user_metadata'->>'team_id')::uuid
  );

-- Policy: Team admins can delete invite codes for their team
CREATE POLICY "Team admins can delete team invite codes"
  ON invite_codes
  FOR DELETE
  TO authenticated
  USING (
    (auth.jwt()->'user_metadata'->>'role')::text = 'admin'
    AND team_id = (auth.jwt()->'user_metadata'->>'team_id')::uuid
  );

-- Update RLS policies for document_chunks to include team-based access
-- Financial documents
DROP POLICY IF EXISTS "Users can view own financial documents" ON document_chunks_financial;
DROP POLICY IF EXISTS "Team members can view team financial documents" ON document_chunks_financial;
CREATE POLICY "Team members can view team financial documents"
  ON document_chunks_financial
  FOR SELECT
  TO authenticated
  USING (
    team_id = (auth.jwt()->'user_metadata'->>'team_id')::uuid
    AND (auth.jwt()->'user_metadata'->>'view_financial')::boolean = true
  );

DROP POLICY IF EXISTS "Users can insert own financial documents" ON document_chunks_financial;
DROP POLICY IF EXISTS "Team members can insert team financial documents" ON document_chunks_financial;
CREATE POLICY "Team members can insert team financial documents"
  ON document_chunks_financial
  FOR INSERT
  TO authenticated
  WITH CHECK (
    team_id = (auth.jwt()->'user_metadata'->>'team_id')::uuid
  );

-- Strategy documents
DROP POLICY IF EXISTS "Users can view own strategy documents" ON document_chunks_strategy;
DROP POLICY IF EXISTS "Team members can view team strategy documents" ON document_chunks_strategy;
CREATE POLICY "Team members can view team strategy documents"
  ON document_chunks_strategy
  FOR SELECT
  TO authenticated
  USING (
    team_id = (auth.jwt()->'user_metadata'->>'team_id')::uuid
  );

DROP POLICY IF EXISTS "Users can insert own strategy documents" ON document_chunks_strategy;
DROP POLICY IF EXISTS "Team members can insert team strategy documents" ON document_chunks_strategy;
CREATE POLICY "Team members can insert team strategy documents"
  ON document_chunks_strategy
  FOR INSERT
  TO authenticated
  WITH CHECK (
    team_id = (auth.jwt()->'user_metadata'->>'team_id')::uuid
  );

-- Meetings documents
DROP POLICY IF EXISTS "Users can view own meeting documents" ON document_chunks_meetings;
DROP POLICY IF EXISTS "Team members can view team meeting documents" ON document_chunks_meetings;
CREATE POLICY "Team members can view team meeting documents"
  ON document_chunks_meetings
  FOR SELECT
  TO authenticated
  USING (
    team_id = (auth.jwt()->'user_metadata'->>'team_id')::uuid
  );

DROP POLICY IF EXISTS "Users can insert own meeting documents" ON document_chunks_meetings;
DROP POLICY IF EXISTS "Team members can insert team meeting documents" ON document_chunks_meetings;
CREATE POLICY "Team members can insert team meeting documents"
  ON document_chunks_meetings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    team_id = (auth.jwt()->'user_metadata'->>'team_id')::uuid
  );

-- Create function to update team updated_at timestamp
CREATE OR REPLACE FUNCTION update_team_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for teams table
DROP TRIGGER IF EXISTS update_teams_updated_at ON teams;
CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION update_team_updated_at();

-- Data Migration: Create RocketHub team and assign existing users
DO $$
DECLARE
  rockethub_team_id uuid;
BEGIN
  -- Create RocketHub team
  INSERT INTO teams (name, created_at)
  VALUES ('RocketHub', now())
  RETURNING id INTO rockethub_team_id;

  -- Update clay@rockethub.ai as admin with financial access
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_set(
    jsonb_set(
      jsonb_set(
        COALESCE(raw_user_meta_data, '{}'::jsonb),
        '{team_id}',
        to_jsonb(rockethub_team_id)
      ),
      '{role}',
      '"admin"'
    ),
    '{view_financial}',
    'true'
  )
  WHERE email = 'clay@rockethub.ai';

  -- Update clay@healthrocket.life as admin with financial access
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_set(
    jsonb_set(
      jsonb_set(
        COALESCE(raw_user_meta_data, '{}'::jsonb),
        '{team_id}',
        to_jsonb(rockethub_team_id)
      ),
      '{role}',
      '"admin"'
    ),
    '{view_financial}',
    'true'
  )
  WHERE email = 'clay@healthrocket.life';

  -- Update remaining users as members with financial access
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_set(
    jsonb_set(
      jsonb_set(
        COALESCE(raw_user_meta_data, '{}'::jsonb),
        '{team_id}',
        to_jsonb(rockethub_team_id)
      ),
      '{role}',
      '"member"'
    ),
    '{view_financial}',
    'true'
  )
  WHERE email NOT IN ('clay@rockethub.ai', 'clay@healthrocket.life');

  -- Update created_by for RocketHub team
  UPDATE teams
  SET created_by = (SELECT id FROM auth.users WHERE email = 'clay@rockethub.ai' LIMIT 1)
  WHERE id = rockethub_team_id;

  -- Update existing document chunks with team_id
  UPDATE document_chunks_financial
  SET team_id = rockethub_team_id
  WHERE team_id IS NULL;

  UPDATE document_chunks_strategy
  SET team_id = rockethub_team_id
  WHERE team_id IS NULL;

  UPDATE document_chunks_meetings
  SET team_id = rockethub_team_id
  WHERE team_id IS NULL;
END $$;
