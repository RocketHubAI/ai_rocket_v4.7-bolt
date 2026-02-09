/*
  # Create Data Sync Sessions Table

  1. New Tables
    - `data_sync_sessions`
      - `id` (uuid, primary key)
      - `team_id` (uuid, references teams)
      - `user_id` (uuid, references auth.users)
      - `sync_type` (text) - 'initial', 'incremental', 'manual'
      - `status` (text) - 'in_progress', 'completed', 'failed'
      - `total_files_discovered` (integer) - files found in folder
      - `files_stored` (integer) - files saved to documents table
      - `files_classified` (integer) - files with Smart Data complete
      - `root_folder_id` (text) - main folder being synced
      - `additional_folders` (jsonb) - array of additional folder IDs
      - `started_at` (timestamptz) - when sync began
      - `completed_at` (timestamptz) - when sync finished
      - `error_message` (text) - error details if failed
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `data_sync_sessions` table
    - Add policy for team members to view their team's sync sessions
    - Add policy for authenticated users to insert their own sync sessions
    - Add policy for users to update their own sync sessions

  3. Indexes
    - Index on team_id for fast lookups
    - Index on status for filtering active syncs
*/

CREATE TABLE IF NOT EXISTS data_sync_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sync_type text NOT NULL CHECK (sync_type IN ('initial', 'incremental', 'manual')),
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'failed')),
  total_files_discovered integer DEFAULT 0,
  files_stored integer DEFAULT 0,
  files_classified integer DEFAULT 0,
  root_folder_id text,
  additional_folders jsonb DEFAULT '[]'::jsonb,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_data_sync_sessions_team_id ON data_sync_sessions(team_id);
CREATE INDEX IF NOT EXISTS idx_data_sync_sessions_status ON data_sync_sessions(status);
CREATE INDEX IF NOT EXISTS idx_data_sync_sessions_user_id ON data_sync_sessions(user_id);

ALTER TABLE data_sync_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view their team sync sessions"
  ON data_sync_sessions
  FOR SELECT
  TO authenticated
  USING (
    team_id IN (
      SELECT team_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own sync sessions"
  ON data_sync_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own sync sessions"
  ON data_sync_sessions
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION update_data_sync_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_data_sync_sessions_updated_at ON data_sync_sessions;
CREATE TRIGGER trigger_update_data_sync_sessions_updated_at
  BEFORE UPDATE ON data_sync_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_data_sync_sessions_updated_at();