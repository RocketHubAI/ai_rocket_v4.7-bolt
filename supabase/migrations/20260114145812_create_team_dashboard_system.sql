/*
  # Team Dashboard System - Core Tables

  1. New Tables
    - `team_dashboard_snapshots`
      - `id` (uuid, primary key) - Unique snapshot identifier
      - `team_id` (uuid) - Reference to teams table
      - `generated_at` (timestamptz) - When the snapshot was generated
      - `goals_progress` (jsonb) - AI-extracted goals, targets, projects with progress
      - `alignment_metrics` (jsonb) - Mission alignment score and core values data
      - `health_overview` (jsonb) - 6 health factors with scores
      - `data_sufficiency` (jsonb) - Flags for each section indicating data availability
      - `source_data_summary` (jsonb) - Summary of data used for generation
      - `generated_by_user_id` (uuid) - User who triggered generation (null for scheduled)
      - `generation_type` (text) - 'scheduled' or 'manual'
      - `is_current` (boolean) - Whether this is the current active snapshot
      - `created_at` (timestamptz) - Record creation timestamp

    - `team_dashboard_settings`
      - `team_id` (uuid, primary key) - Reference to teams table
      - `is_enabled` (boolean) - Whether dashboard generation is enabled
      - `last_generated_at` (timestamptz) - Last successful generation time
      - `next_generation_at` (timestamptz) - Next scheduled generation time
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on both tables
    - Team members can view their team's snapshots
    - Only admins can modify settings
    - Super admins have full access

  3. Indexes
    - Composite index on (team_id, is_current) for fast current snapshot lookup
    - Index on next_generation_at for scheduled processing
    - Index on (team_id, generated_at) for historical queries
*/

-- Create team_dashboard_snapshots table
CREATE TABLE IF NOT EXISTS team_dashboard_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  generated_at timestamptz NOT NULL DEFAULT now(),
  goals_progress jsonb DEFAULT '{"has_data": false, "items": [], "suggestions": []}'::jsonb,
  alignment_metrics jsonb DEFAULT '{"has_data": false, "mission_statement": null, "core_values": [], "alignment_score": null, "examples": [], "suggestions": []}'::jsonb,
  health_overview jsonb DEFAULT '{"overall_score": null, "factors": [], "trend_vs_previous": null, "explanation": null}'::jsonb,
  data_sufficiency jsonb DEFAULT '{"goals": false, "alignment": false, "health": false}'::jsonb,
  source_data_summary jsonb DEFAULT '{}'::jsonb,
  generated_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  generation_type text NOT NULL DEFAULT 'scheduled' CHECK (generation_type IN ('scheduled', 'manual')),
  is_current boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create team_dashboard_settings table
CREATE TABLE IF NOT EXISTS team_dashboard_settings (
  team_id uuid PRIMARY KEY REFERENCES teams(id) ON DELETE CASCADE,
  is_enabled boolean NOT NULL DEFAULT true,
  last_generated_at timestamptz,
  next_generation_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_team_dashboard_snapshots_current 
  ON team_dashboard_snapshots(team_id, is_current) 
  WHERE is_current = true;

CREATE INDEX IF NOT EXISTS idx_team_dashboard_snapshots_history 
  ON team_dashboard_snapshots(team_id, generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_team_dashboard_settings_next_gen 
  ON team_dashboard_settings(next_generation_at) 
  WHERE is_enabled = true;

-- Enable RLS
ALTER TABLE team_dashboard_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_dashboard_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for team_dashboard_snapshots

-- Team members can view their team's snapshots
CREATE POLICY "Team members can view dashboard snapshots"
  ON team_dashboard_snapshots
  FOR SELECT
  TO authenticated
  USING (
    team_id IN (
      SELECT u.team_id FROM users u WHERE u.id = auth.uid()
    )
  );

-- Only service role can insert (edge functions)
CREATE POLICY "Service role can insert dashboard snapshots"
  ON team_dashboard_snapshots
  FOR INSERT
  TO authenticated
  WITH CHECK (
    team_id IN (
      SELECT u.team_id FROM users u WHERE u.id = auth.uid()
    )
  );

-- Only service role can update (for is_current flag)
CREATE POLICY "Service role can update dashboard snapshots"
  ON team_dashboard_snapshots
  FOR UPDATE
  TO authenticated
  USING (
    team_id IN (
      SELECT u.team_id FROM users u WHERE u.id = auth.uid()
    )
  );

-- Super admin can view all snapshots
CREATE POLICY "Super admin can view all dashboard snapshots"
  ON team_dashboard_snapshots
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.email IN (
        'clay@rockethub.ai',
        'nick@rockethub.ai',
        'hello@rockethub.ai'
      )
    )
  );

-- RLS Policies for team_dashboard_settings

-- Team members can view their team's settings
CREATE POLICY "Team members can view dashboard settings"
  ON team_dashboard_settings
  FOR SELECT
  TO authenticated
  USING (
    team_id IN (
      SELECT u.team_id FROM users u WHERE u.id = auth.uid()
    )
  );

-- Team admins can update settings
CREATE POLICY "Team admins can update dashboard settings"
  ON team_dashboard_settings
  FOR UPDATE
  TO authenticated
  USING (
    team_id IN (
      SELECT u.team_id FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role IN ('admin', 'owner')
    )
  )
  WITH CHECK (
    team_id IN (
      SELECT u.team_id FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role IN ('admin', 'owner')
    )
  );

-- Allow insert for team creation flow
CREATE POLICY "Allow insert for team settings"
  ON team_dashboard_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    team_id IN (
      SELECT u.team_id FROM users u WHERE u.id = auth.uid()
    )
  );

-- Super admin can view all settings
CREATE POLICY "Super admin can view all dashboard settings"
  ON team_dashboard_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.email IN (
        'clay@rockethub.ai',
        'nick@rockethub.ai',
        'hello@rockethub.ai'
      )
    )
  );

-- Super admin can update all settings
CREATE POLICY "Super admin can update all dashboard settings"
  ON team_dashboard_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.email IN (
        'clay@rockethub.ai',
        'nick@rockethub.ai',
        'hello@rockethub.ai'
      )
    )
  );

-- Auto-create settings for existing teams
INSERT INTO team_dashboard_settings (team_id, is_enabled, next_generation_at)
SELECT 
  id,
  true,
  (CURRENT_DATE + INTERVAL '1 day')::date + TIME '05:00:00' AT TIME ZONE 'UTC'
FROM teams
WHERE id NOT IN (SELECT team_id FROM team_dashboard_settings)
ON CONFLICT (team_id) DO NOTHING;

-- Trigger to auto-create settings for new teams
CREATE OR REPLACE FUNCTION create_team_dashboard_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO team_dashboard_settings (team_id, is_enabled, next_generation_at)
  VALUES (
    NEW.id,
    true,
    (CURRENT_DATE + INTERVAL '1 day')::date + TIME '05:00:00' AT TIME ZONE 'UTC'
  )
  ON CONFLICT (team_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_create_team_dashboard_settings ON teams;
CREATE TRIGGER trigger_create_team_dashboard_settings
  AFTER INSERT ON teams
  FOR EACH ROW
  EXECUTE FUNCTION create_team_dashboard_settings();

-- Enable realtime for dashboard snapshots
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'team_dashboard_snapshots'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE team_dashboard_snapshots;
  END IF;
END $$;