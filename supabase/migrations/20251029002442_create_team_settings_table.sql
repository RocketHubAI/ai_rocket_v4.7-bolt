/*
  # Create team_settings table

  1. New Tables
    - `team_settings`
      - `team_id` (uuid, primary key, foreign key to teams)
      - `meeting_types` (jsonb) - Array of meeting type configurations
      - `news_preferences` (jsonb) - News monitoring preferences
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `team_settings` table
    - Add policy for team admins to manage their team settings
    - Add policy for team members to view their team settings

  3. Structure
    - meeting_types: [{ type: string, description: string, enabled: boolean }]
    - news_preferences: { enabled: boolean, industries: string[], custom_topics: string, max_results: number }
*/

-- Create team_settings table
CREATE TABLE IF NOT EXISTS team_settings (
  team_id UUID PRIMARY KEY REFERENCES teams(id) ON DELETE CASCADE,
  meeting_types JSONB NOT NULL DEFAULT '[]'::jsonb,
  news_preferences JSONB NOT NULL DEFAULT '{"enabled": false, "industries": [], "custom_topics": "", "max_results": 10}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE team_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Team members can view their team settings
CREATE POLICY "Team members can view team settings"
  ON team_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.team_id = team_settings.team_id
    )
  );

-- Policy: Team admins can insert team settings
CREATE POLICY "Team admins can insert team settings"
  ON team_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.team_id = team_settings.team_id
      AND users.role = 'admin'
    )
  );

-- Policy: Team admins can update team settings
CREATE POLICY "Team admins can update team settings"
  ON team_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.team_id = team_settings.team_id
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.team_id = team_settings.team_id
      AND users.role = 'admin'
    )
  );

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_team_settings_team_id ON team_settings(team_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_team_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER team_settings_updated_at
  BEFORE UPDATE ON team_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_team_settings_updated_at();
