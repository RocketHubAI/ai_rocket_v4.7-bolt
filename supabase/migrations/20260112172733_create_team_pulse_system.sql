/*
  # Create Team Pulse System

  1. Overview
    Team Pulse provides "A Weekly Snapshot of Team Health, Progress and Insights"
    by aggregating team data and generating AI-powered infographic images.

  2. New Tables
    - `team_pulse_snapshots`: Stores generated snapshots with health scores and infographics
      - `id` (uuid, primary key)
      - `team_id` (uuid, foreign key to teams)
      - `generated_at` (timestamptz)
      - `health_score` (integer 0-100)
      - `health_explanation` (text)
      - `health_factors` (jsonb)
      - `infographic_url` (text)
      - `infographic_base64` (text, fallback storage)
      - `source_data_summary` (jsonb)
      - `sections` (jsonb)
      - `insights_and_trends` (jsonb)
      - `generated_by_user_id` (uuid, nullable)
      - `generation_type` (text: 'scheduled' or 'manual')
      - `is_current` (boolean)
      - `created_at` (timestamptz)

    - `team_pulse_settings`: Per-team configuration
      - `team_id` (uuid, primary key)
      - `is_enabled` (boolean)
      - `generation_day` (integer 0-6)
      - `generation_hour` (integer 0-23)
      - `last_generated_at` (timestamptz)
      - `next_generation_at` (timestamptz)
      - `created_at`, `updated_at` (timestamptz)

  3. Security
    - Enable RLS on both tables
    - Team members can view snapshots for their team
    - Team admins can trigger generation and update settings
    - Super admins have full access via is_super_admin() function

  4. Storage
    - Create bucket for team-pulse-infographics
*/

-- Create team_pulse_snapshots table
CREATE TABLE IF NOT EXISTS team_pulse_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  generated_at timestamptz NOT NULL DEFAULT now(),
  health_score integer NOT NULL DEFAULT 0 CHECK (health_score >= 0 AND health_score <= 100),
  health_explanation text,
  health_factors jsonb DEFAULT '{}'::jsonb,
  infographic_url text,
  infographic_base64 text,
  source_data_summary jsonb DEFAULT '{}'::jsonb,
  sections jsonb DEFAULT '{}'::jsonb,
  insights_and_trends jsonb DEFAULT '{}'::jsonb,
  generated_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  generation_type text NOT NULL DEFAULT 'manual' CHECK (generation_type IN ('scheduled', 'manual')),
  is_current boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_team_pulse_snapshots_team_id ON team_pulse_snapshots(team_id);
CREATE INDEX IF NOT EXISTS idx_team_pulse_snapshots_generated_at ON team_pulse_snapshots(generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_team_pulse_snapshots_is_current ON team_pulse_snapshots(team_id, is_current) WHERE is_current = true;

-- Create team_pulse_settings table
CREATE TABLE IF NOT EXISTS team_pulse_settings (
  team_id uuid PRIMARY KEY REFERENCES teams(id) ON DELETE CASCADE,
  is_enabled boolean NOT NULL DEFAULT true,
  generation_day integer NOT NULL DEFAULT 1 CHECK (generation_day >= 0 AND generation_day <= 6),
  generation_hour integer NOT NULL DEFAULT 9 CHECK (generation_hour >= 0 AND generation_hour <= 23),
  last_generated_at timestamptz,
  next_generation_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on team_pulse_snapshots
ALTER TABLE team_pulse_snapshots ENABLE ROW LEVEL SECURITY;

-- Policy: Team members can view their team's snapshots
CREATE POLICY "Team members can view team pulse snapshots"
  ON team_pulse_snapshots
  FOR SELECT
  TO authenticated
  USING (
    team_id = (SELECT team_id FROM public.users WHERE id = auth.uid())
    OR is_super_admin()
  );

-- Policy: Team admins can insert snapshots
CREATE POLICY "Team admins can insert team pulse snapshots"
  ON team_pulse_snapshots
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      team_id = (SELECT team_id FROM public.users WHERE id = auth.uid())
      AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
    )
    OR is_super_admin()
  );

-- Policy: Team admins can update snapshots (for is_current flag)
CREATE POLICY "Team admins can update team pulse snapshots"
  ON team_pulse_snapshots
  FOR UPDATE
  TO authenticated
  USING (
    (
      team_id = (SELECT team_id FROM public.users WHERE id = auth.uid())
      AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
    )
    OR is_super_admin()
  )
  WITH CHECK (
    (
      team_id = (SELECT team_id FROM public.users WHERE id = auth.uid())
    )
    OR is_super_admin()
  );

-- Enable RLS on team_pulse_settings
ALTER TABLE team_pulse_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Team members can view their team's settings
CREATE POLICY "Team members can view team pulse settings"
  ON team_pulse_settings
  FOR SELECT
  TO authenticated
  USING (
    team_id = (SELECT team_id FROM public.users WHERE id = auth.uid())
    OR is_super_admin()
  );

-- Policy: Team admins can insert settings
CREATE POLICY "Team admins can insert team pulse settings"
  ON team_pulse_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      team_id = (SELECT team_id FROM public.users WHERE id = auth.uid())
      AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
    )
    OR is_super_admin()
  );

-- Policy: Team admins can update settings
CREATE POLICY "Team admins can update team pulse settings"
  ON team_pulse_settings
  FOR UPDATE
  TO authenticated
  USING (
    (
      team_id = (SELECT team_id FROM public.users WHERE id = auth.uid())
      AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
    )
    OR is_super_admin()
  )
  WITH CHECK (
    (
      team_id = (SELECT team_id FROM public.users WHERE id = auth.uid())
    )
    OR is_super_admin()
  );

-- Create storage bucket for infographics
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'team-pulse-infographics',
  'team-pulse-infographics',
  true,
  10485760,
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for team-pulse-infographics bucket
CREATE POLICY "Anyone can view team pulse infographics"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'team-pulse-infographics');

CREATE POLICY "Team admins can upload team pulse infographics"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'team-pulse-infographics'
    AND (
      (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
      OR is_super_admin()
    )
  );

-- Function to auto-initialize team pulse settings when a team is created
CREATE OR REPLACE FUNCTION initialize_team_pulse_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO team_pulse_settings (team_id, next_generation_at)
  VALUES (
    NEW.id,
    (date_trunc('week', now()) + interval '1 week' + interval '1 day' + interval '9 hours')
  )
  ON CONFLICT (team_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Create trigger for auto-initialization
DROP TRIGGER IF EXISTS trigger_initialize_team_pulse_settings ON teams;
CREATE TRIGGER trigger_initialize_team_pulse_settings
  AFTER INSERT ON teams
  FOR EACH ROW
  EXECUTE FUNCTION initialize_team_pulse_settings();

-- Initialize settings for existing teams
INSERT INTO team_pulse_settings (team_id, next_generation_at)
SELECT 
  id,
  (date_trunc('week', now()) + interval '1 week' + interval '1 day' + interval '9 hours')
FROM teams
WHERE id NOT IN (SELECT team_id FROM team_pulse_settings)
ON CONFLICT (team_id) DO NOTHING;