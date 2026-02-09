/*
  # Complete Teams Migration - Safe to Run Multiple Times

  This script completes the teams migration and can be run even if parts were already applied.
  It uses IF NOT EXISTS and DROP IF EXISTS to ensure idempotency.
*/

-- Ensure teams table exists
CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on teams
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies for teams
DROP POLICY IF EXISTS "Team members can view their team" ON teams;
DROP POLICY IF EXISTS "Team admins can update their team" ON teams;
DROP POLICY IF EXISTS "Authenticated users can create teams" ON teams;

CREATE POLICY "Team members can view their team"
  ON teams
  FOR SELECT
  TO authenticated
  USING (
    id = (auth.jwt()->'user_metadata'->>'team_id')::uuid
  );

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

CREATE POLICY "Authenticated users can create teams"
  ON teams
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add team_id and other columns to invite_codes if not exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invite_codes') THEN
    ALTER TABLE invite_codes ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES teams(id) ON DELETE CASCADE;
    ALTER TABLE invite_codes ADD COLUMN IF NOT EXISTS invited_email text;
    ALTER TABLE invite_codes ADD COLUMN IF NOT EXISTS assigned_role text DEFAULT 'member';
    ALTER TABLE invite_codes ADD COLUMN IF NOT EXISTS view_financial boolean DEFAULT true;

    -- Add constraint if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'invite_codes_assigned_role_check'
    ) THEN
      ALTER TABLE invite_codes ADD CONSTRAINT invite_codes_assigned_role_check CHECK (assigned_role IN ('admin', 'member'));
    END IF;
  END IF;
END $$;

-- Add team_id to document_chunks tables if they exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'document_chunks_financial') THEN
    ALTER TABLE document_chunks_financial ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES teams(id) ON DELETE CASCADE;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'document_chunks_strategy') THEN
    ALTER TABLE document_chunks_strategy ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES teams(id) ON DELETE CASCADE;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'document_chunks_meetings') THEN
    ALTER TABLE document_chunks_meetings ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES teams(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_teams_created_by ON teams(created_by);
CREATE INDEX IF NOT EXISTS idx_invite_codes_team_id ON invite_codes(team_id);
CREATE INDEX IF NOT EXISTS idx_invite_codes_invited_email ON invite_codes(invited_email);
CREATE INDEX IF NOT EXISTS idx_document_chunks_financial_team_id ON document_chunks_financial(team_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_strategy_team_id ON document_chunks_strategy(team_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_meetings_team_id ON document_chunks_meetings(team_id);

-- Update RLS policies for invite_codes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invite_codes') THEN
    DROP POLICY IF EXISTS "Super-admins can view all invite codes" ON invite_codes;
    DROP POLICY IF EXISTS "Super-admins can create invite codes" ON invite_codes;
    DROP POLICY IF EXISTS "Super-admins can update invite codes" ON invite_codes;
    DROP POLICY IF EXISTS "Super-admins can delete invite codes" ON invite_codes;
    DROP POLICY IF EXISTS "Team admins can view team invite codes" ON invite_codes;
    DROP POLICY IF EXISTS "Team admins can create team invite codes" ON invite_codes;
    DROP POLICY IF EXISTS "Team admins can update team invite codes" ON invite_codes;
    DROP POLICY IF EXISTS "Team admins can delete team invite codes" ON invite_codes;

    CREATE POLICY "Team admins can view team invite codes"
      ON invite_codes
      FOR SELECT
      TO authenticated
      USING (
        (auth.jwt()->'user_metadata'->>'role')::text = 'admin'
        AND team_id = (auth.jwt()->'user_metadata'->>'team_id')::uuid
      );

    CREATE POLICY "Team admins can create team invite codes"
      ON invite_codes
      FOR INSERT
      TO authenticated
      WITH CHECK (
        (auth.jwt()->'user_metadata'->>'role')::text = 'admin'
        AND team_id = (auth.jwt()->'user_metadata'->>'team_id')::uuid
      );

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

    CREATE POLICY "Team admins can delete team invite codes"
      ON invite_codes
      FOR DELETE
      TO authenticated
      USING (
        (auth.jwt()->'user_metadata'->>'role')::text = 'admin'
        AND team_id = (auth.jwt()->'user_metadata'->>'team_id')::uuid
      );
  END IF;
END $$;

-- Update RLS policies for document_chunks tables
DO $$
BEGIN
  -- Financial documents
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'document_chunks_financial') THEN
    DROP POLICY IF EXISTS "Users can view own financial documents" ON document_chunks_financial;
    DROP POLICY IF EXISTS "Users can insert own financial documents" ON document_chunks_financial;
    DROP POLICY IF EXISTS "Team members can view team financial documents" ON document_chunks_financial;
    DROP POLICY IF EXISTS "Team members can insert team financial documents" ON document_chunks_financial;

    CREATE POLICY "Team members can view team financial documents"
      ON document_chunks_financial
      FOR SELECT
      TO authenticated
      USING (
        team_id = (auth.jwt()->'user_metadata'->>'team_id')::uuid
        AND (auth.jwt()->'user_metadata'->>'view_financial')::boolean = true
      );

    CREATE POLICY "Team members can insert team financial documents"
      ON document_chunks_financial
      FOR INSERT
      TO authenticated
      WITH CHECK (
        team_id = (auth.jwt()->'user_metadata'->>'team_id')::uuid
      );
  END IF;

  -- Strategy documents
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'document_chunks_strategy') THEN
    DROP POLICY IF EXISTS "Users can view own strategy documents" ON document_chunks_strategy;
    DROP POLICY IF EXISTS "Users can insert own strategy documents" ON document_chunks_strategy;
    DROP POLICY IF EXISTS "Team members can view team strategy documents" ON document_chunks_strategy;
    DROP POLICY IF EXISTS "Team members can insert team strategy documents" ON document_chunks_strategy;

    CREATE POLICY "Team members can view team strategy documents"
      ON document_chunks_strategy
      FOR SELECT
      TO authenticated
      USING (
        team_id = (auth.jwt()->'user_metadata'->>'team_id')::uuid
      );

    CREATE POLICY "Team members can insert team strategy documents"
      ON document_chunks_strategy
      FOR INSERT
      TO authenticated
      WITH CHECK (
        team_id = (auth.jwt()->'user_metadata'->>'team_id')::uuid
      );
  END IF;

  -- Meetings documents
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'document_chunks_meetings') THEN
    DROP POLICY IF EXISTS "Users can view own meeting documents" ON document_chunks_meetings;
    DROP POLICY IF EXISTS "Users can insert own meeting documents" ON document_chunks_meetings;
    DROP POLICY IF EXISTS "Team members can view team meeting documents" ON document_chunks_meetings;
    DROP POLICY IF EXISTS "Team members can insert team meeting documents" ON document_chunks_meetings;

    CREATE POLICY "Team members can view team meeting documents"
      ON document_chunks_meetings
      FOR SELECT
      TO authenticated
      USING (
        team_id = (auth.jwt()->'user_metadata'->>'team_id')::uuid
      );

    CREATE POLICY "Team members can insert team meeting documents"
      ON document_chunks_meetings
      FOR INSERT
      TO authenticated
      WITH CHECK (
        team_id = (auth.jwt()->'user_metadata'->>'team_id')::uuid
      );
  END IF;
END $$;

-- Create or replace trigger function for teams
CREATE OR REPLACE FUNCTION update_team_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS update_teams_updated_at ON teams;
CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION update_team_updated_at();

-- Data Migration: Create RocketHub team if it doesn't exist
DO $$
DECLARE
  rockethub_team_id uuid;
  existing_team_id uuid;
BEGIN
  -- Check if RocketHub team already exists
  SELECT id INTO existing_team_id FROM teams WHERE name = 'RocketHub' LIMIT 1;

  IF existing_team_id IS NULL THEN
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
  ELSE
    -- Use existing team
    rockethub_team_id := existing_team_id;
  END IF;

  -- Update existing document chunks with team_id if they don't have one
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'document_chunks_financial') THEN
    UPDATE document_chunks_financial
    SET team_id = rockethub_team_id
    WHERE team_id IS NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'document_chunks_strategy') THEN
    UPDATE document_chunks_strategy
    SET team_id = rockethub_team_id
    WHERE team_id IS NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'document_chunks_meetings') THEN
    UPDATE document_chunks_meetings
    SET team_id = rockethub_team_id
    WHERE team_id IS NULL;
  END IF;
END $$;
