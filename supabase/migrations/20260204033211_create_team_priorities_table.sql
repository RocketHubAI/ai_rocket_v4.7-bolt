/*
  # Create Team Priorities Table

  1. New Tables
    - `team_priorities`
      - `id` (uuid, primary key)
      - `team_id` (uuid, foreign key to teams)
      - `user_id` (uuid, foreign key to auth.users) 
      - `priority_type` (text) - Type: 'ai_goals', 'improvement_areas', 'recurring_tasks', 'other'
      - `priority_value` (text) - The user's response
      - `source` (text) - Where this was captured from (e.g., 'onboarding', 'conversation')
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Team members can read their team's priorities
    - Team admins can insert/update priorities
*/

CREATE TABLE IF NOT EXISTS team_priorities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  priority_type text NOT NULL CHECK (priority_type IN ('ai_goals', 'improvement_areas', 'recurring_tasks', 'other')),
  priority_value text NOT NULL,
  source text DEFAULT 'onboarding',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_priorities_team_id ON team_priorities(team_id);
CREATE INDEX IF NOT EXISTS idx_team_priorities_type ON team_priorities(priority_type);

ALTER TABLE team_priorities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view their team priorities"
  ON team_priorities
  FOR SELECT
  TO authenticated
  USING (
    team_id = (SELECT team_id FROM public.users WHERE id = auth.uid())
  );

CREATE POLICY "Team admins can insert priorities"
  ON team_priorities
  FOR INSERT
  TO authenticated
  WITH CHECK (
    team_id = (SELECT team_id FROM public.users WHERE id = auth.uid())
    AND (
      (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
      OR user_id = auth.uid()
    )
  );

CREATE POLICY "Team admins can update priorities"
  ON team_priorities
  FOR UPDATE
  TO authenticated
  USING (
    team_id = (SELECT team_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    team_id = (SELECT team_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Team admins can delete priorities"
  ON team_priorities
  FOR DELETE
  TO authenticated
  USING (
    team_id = (SELECT team_id FROM public.users WHERE id = auth.uid())
    AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );