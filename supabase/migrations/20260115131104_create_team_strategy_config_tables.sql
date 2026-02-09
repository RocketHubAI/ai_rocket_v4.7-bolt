/*
  # Create Team Strategy Configuration Tables

  1. New Tables
    - `team_strategy_config`
      - `team_id` (uuid, primary key, references teams)
      - `mission_statement` (text) - The team's mission statement
      - `purpose` (text) - Purpose/cause/passion statement
      - `niche` (text) - Target market/niche description
      - `core_values` (text[]) - Array of core values
      - `extracted_from_document` (text) - Source document name if AI-extracted
      - `is_verified` (boolean) - Whether a human has verified/edited the data
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `team_goals`
      - `id` (uuid, primary key)
      - `team_id` (uuid, references teams)
      - `name` (text) - Goal name/description
      - `type` (text) - goal, okr, target, milestone, project, kpi
      - `status` (text) - on_track, at_risk, blocked, not_started, completed
      - `progress_percentage` (integer) - 0-100
      - `notes` (text) - Context and updates
      - `source_reference` (text) - Where the goal was found
      - `deadline` (date) - Target completion date
      - `owner` (text) - Person responsible
      - `is_active` (boolean) - Whether goal is currently active
      - `display_order` (integer) - Order in dashboard
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Team members can read their team's config
    - Team admins can update config
*/

CREATE TABLE IF NOT EXISTS team_strategy_config (
  team_id uuid PRIMARY KEY REFERENCES teams(id) ON DELETE CASCADE,
  mission_statement text,
  purpose text,
  niche text,
  core_values text[] DEFAULT '{}',
  extracted_from_document text,
  is_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS team_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'goal' CHECK (type IN ('goal', 'okr', 'target', 'milestone', 'project', 'kpi')),
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('on_track', 'at_risk', 'blocked', 'not_started', 'completed')),
  progress_percentage integer CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  notes text,
  source_reference text,
  deadline date,
  owner text,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_goals_team_id ON team_goals(team_id);
CREATE INDEX IF NOT EXISTS idx_team_goals_active ON team_goals(team_id, is_active) WHERE is_active = true;

ALTER TABLE team_strategy_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view their team strategy config"
  ON team_strategy_config
  FOR SELECT
  TO authenticated
  USING (
    team_id IN (
      SELECT team_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Team admins can update strategy config"
  ON team_strategy_config
  FOR UPDATE
  TO authenticated
  USING (
    team_id IN (
      SELECT team_id FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'owner')
    )
  )
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Team admins can insert strategy config"
  ON team_strategy_config
  FOR INSERT
  TO authenticated
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Team members can view their team goals"
  ON team_goals
  FOR SELECT
  TO authenticated
  USING (
    team_id IN (
      SELECT team_id FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Team admins can manage goals"
  ON team_goals
  FOR ALL
  TO authenticated
  USING (
    team_id IN (
      SELECT team_id FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'owner')
    )
  )
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Service role can manage strategy config"
  ON team_strategy_config
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage goals"
  ON team_goals
  FOR ALL
  USING (true)
  WITH CHECK (true);