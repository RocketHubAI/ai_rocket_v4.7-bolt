/*
  # Create User Google Drive Connections Table

  ## Overview
  This migration enables multi-tenant Google Drive integration by storing per-user/per-team
  Google Drive OAuth credentials and folder configurations.

  ## 1. New Tables
    - `user_drive_connections`
      - `id` (uuid, primary key) - Unique identifier
      - `user_id` (uuid, foreign key) - References auth.users
      - `team_id` (uuid, foreign key) - References teams table
      - `access_token` (text) - Google OAuth access token (encrypted)
      - `refresh_token` (text) - Google OAuth refresh token (encrypted)
      - `token_expires_at` (timestamptz) - Token expiration timestamp
      - `meetings_folder_id` (text) - Google Drive folder ID for meetings documents
      - `meetings_folder_name` (text) - Display name for meetings folder
      - `strategy_folder_id` (text) - Google Drive folder ID for strategy documents
      - `strategy_folder_name` (text) - Display name for strategy folder
      - `is_active` (boolean) - Whether connection is active
      - `connection_status` (text) - Status: 'connected', 'error', 'disconnected'
      - `last_sync_at` (timestamptz) - Last successful sync timestamp
      - `google_account_email` (text) - Connected Google account email
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Record update timestamp

  ## 2. Constraints
    - Unique constraint on user_id (one connection per user)
    - Unique constraint on team_id (one connection per team)
    - Foreign key to auth.users with CASCADE delete
    - Foreign key to teams with CASCADE delete

  ## 3. Security (Row Level Security)
    - Enable RLS on user_drive_connections table
    - Users can view their own connection
    - Users can update their own connection
    - Admins can view team connections

  ## 4. Indexes
    - Index on user_id for fast lookups
    - Index on team_id for team-based queries
    - Index on is_active for filtering active connections

  ## 5. Important Notes
    - Tokens should be encrypted at rest (consider pgcrypto if not already using Supabase's built-in encryption)
    - This table stores sensitive OAuth credentials - access must be strictly controlled
    - Each user/team can only have ONE active Google Drive connection
    - Designed to support both personal workspace and team-based data sync
*/

-- Create user_drive_connections table
CREATE TABLE IF NOT EXISTS user_drive_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
  
  -- OAuth credentials
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  token_expires_at timestamptz NOT NULL,
  
  -- Folder configurations
  meetings_folder_id text,
  meetings_folder_name text,
  strategy_folder_id text,
  strategy_folder_name text,
  
  -- Connection status
  is_active boolean DEFAULT true NOT NULL,
  connection_status text DEFAULT 'connected' NOT NULL,
  last_sync_at timestamptz,
  
  -- Metadata
  google_account_email text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  
  -- Constraints
  UNIQUE(user_id),
  UNIQUE(team_id),
  
  -- Check constraints
  CONSTRAINT valid_connection_status CHECK (
    connection_status IN ('connected', 'error', 'disconnected', 'token_expired')
  )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_drive_connections_user_id 
  ON user_drive_connections(user_id);

CREATE INDEX IF NOT EXISTS idx_user_drive_connections_team_id 
  ON user_drive_connections(team_id);

CREATE INDEX IF NOT EXISTS idx_user_drive_connections_active 
  ON user_drive_connections(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_user_drive_connections_sync 
  ON user_drive_connections(last_sync_at) WHERE is_active = true;

-- Enable Row Level Security
ALTER TABLE user_drive_connections ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own drive connection
CREATE POLICY "Users can view own drive connection"
  ON user_drive_connections
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own drive connection
CREATE POLICY "Users can insert own drive connection"
  ON user_drive_connections
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own drive connection
CREATE POLICY "Users can update own drive connection"
  ON user_drive_connections
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own drive connection
CREATE POLICY "Users can delete own drive connection"
  ON user_drive_connections
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policy: Admins can view team drive connections
CREATE POLICY "Admins can view team drive connections"
  ON user_drive_connections
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.team_id = user_drive_connections.team_id
        AND users.role = 'admin'
    )
  );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_drive_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function on update
DROP TRIGGER IF EXISTS update_user_drive_connections_timestamp ON user_drive_connections;
CREATE TRIGGER update_user_drive_connections_timestamp
  BEFORE UPDATE ON user_drive_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_user_drive_connections_updated_at();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON user_drive_connections TO authenticated;

-- Add helpful comments
COMMENT ON TABLE user_drive_connections IS 'Stores per-user/per-team Google Drive OAuth credentials and folder configurations for multi-tenant data sync';
COMMENT ON COLUMN user_drive_connections.access_token IS 'Google OAuth access token - should be encrypted';
COMMENT ON COLUMN user_drive_connections.refresh_token IS 'Google OAuth refresh token - should be encrypted';
COMMENT ON COLUMN user_drive_connections.meetings_folder_id IS 'Google Drive folder ID containing meeting documents';
COMMENT ON COLUMN user_drive_connections.strategy_folder_id IS 'Google Drive folder ID containing strategy documents';
