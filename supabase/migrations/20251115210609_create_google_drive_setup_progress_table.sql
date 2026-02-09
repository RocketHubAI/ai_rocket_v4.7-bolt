/*
  # Create Google Drive Setup Progress Table

  1. New Tables
    - `google_drive_setup_progress`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `team_id` (uuid, foreign key to teams)
      - `current_step` (integer) - Current step in the guided setup (0-4)
      - `completed_steps` (integer[]) - Array of completed step numbers
      - `strategy_folders_selected` (jsonb) - Selected strategy folder IDs
      - `meetings_folders_selected` (jsonb) - Selected meetings folder IDs
      - `financial_folders_selected` (jsonb) - Selected financial folder IDs
      - `is_completed` (boolean) - Whether the setup is fully completed
      - `started_at` (timestamptz) - When the user started the guided setup
      - `last_updated_at` (timestamptz) - Last update timestamp
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `google_drive_setup_progress` table
    - Add policies for authenticated users to manage their own setup progress
    - Team members can view team setup progress

  3. Indexes
    - Index on user_id for faster lookups
    - Index on team_id for team-based queries
*/

CREATE TABLE IF NOT EXISTS google_drive_setup_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
  current_step integer DEFAULT 0 NOT NULL,
  completed_steps integer[] DEFAULT '{}',
  strategy_folders_selected jsonb DEFAULT '[]',
  meetings_folders_selected jsonb DEFAULT '[]',
  financial_folders_selected jsonb DEFAULT '[]',
  is_completed boolean DEFAULT false NOT NULL,
  started_at timestamptz DEFAULT now() NOT NULL,
  last_updated_at timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE google_drive_setup_progress ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own setup progress
CREATE POLICY "Users can view own setup progress"
  ON google_drive_setup_progress
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own setup progress
CREATE POLICY "Users can create own setup progress"
  ON google_drive_setup_progress
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own setup progress
CREATE POLICY "Users can update own setup progress"
  ON google_drive_setup_progress
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own setup progress
CREATE POLICY "Users can delete own setup progress"
  ON google_drive_setup_progress
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_google_drive_setup_progress_user_id 
  ON google_drive_setup_progress(user_id);

CREATE INDEX IF NOT EXISTS idx_google_drive_setup_progress_team_id 
  ON google_drive_setup_progress(team_id);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_google_drive_setup_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.last_updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update timestamps
CREATE TRIGGER update_google_drive_setup_progress_timestamp
  BEFORE UPDATE ON google_drive_setup_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_google_drive_setup_progress_updated_at();