/*
  # User Priorities & Per-User Assistant Name

  1. New Tables
    - `user_priorities`
      - `id` (uuid, primary key)
      - `user_id` (uuid, FK to auth.users)
      - `team_id` (uuid, FK to teams)
      - `priority_type` (text: 'personal_goals', 'focus_areas', 'recurring_tasks', 'other')
      - `priority_value` (text, the priority description)
      - `source` (text, defaults to 'onboarding')
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Modified Tables
    - `user_assistant_preferences`
      - Added `assistant_name` (text, nullable) - per-user custom name for the assistant
      - Added `member_onboarding_completed` (boolean) - tracks if non-admin onboarding is done

  3. Security
    - Enable RLS on `user_priorities` table
    - Users can CRUD their own priorities
    - Team admins and super admins can view all team member priorities
    - Per-user assistant name is private to each user

  4. Notes
    - `user_priorities` is separate from `team_priorities` - team priorities are set by
      admins and apply to everyone; user priorities are personal
    - If `assistant_name` is NULL, the team-level name from `team_agent_settings` is used
    - `member_onboarding_completed` allows tracking member-specific onboarding independently
      from the team-level `onboarding_completed` in `team_agent_settings`
*/

-- Create user_priorities table
CREATE TABLE IF NOT EXISTS user_priorities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  priority_type text NOT NULL CHECK (priority_type IN ('personal_goals', 'focus_areas', 'recurring_tasks', 'other')),
  priority_value text NOT NULL,
  source text DEFAULT 'onboarding',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_priorities_user_id ON user_priorities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_priorities_team_id ON user_priorities(team_id);

ALTER TABLE user_priorities ENABLE ROW LEVEL SECURITY;

-- Users can view their own priorities
CREATE POLICY "Users can view own priorities"
  ON user_priorities FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own priorities
CREATE POLICY "Users can insert own priorities"
  ON user_priorities FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own priorities
CREATE POLICY "Users can update own priorities"
  ON user_priorities FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own priorities
CREATE POLICY "Users can delete own priorities"
  ON user_priorities FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Team admins can view all team member priorities (for dashboard/insights)
CREATE POLICY "Team admins can view team member priorities"
  ON user_priorities FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.team_id = user_priorities.team_id
      AND users.role = 'admin'
    )
  );

-- Super admins can manage all priorities
CREATE POLICY "Super admins can manage all user priorities"
  ON user_priorities FOR ALL
  TO authenticated
  USING (
    auth.jwt() ->> 'email' IN ('clay@rockethub.ai', 'john@rockethub.ai')
  );

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_user_priorities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_priorities_timestamp
  BEFORE UPDATE ON user_priorities
  FOR EACH ROW
  EXECUTE FUNCTION update_user_priorities_updated_at();

-- Add per-user assistant name to user_assistant_preferences
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_assistant_preferences' AND column_name = 'assistant_name'
  ) THEN
    ALTER TABLE user_assistant_preferences ADD COLUMN assistant_name text DEFAULT NULL;
  END IF;
END $$;

-- Add member onboarding tracking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_assistant_preferences' AND column_name = 'member_onboarding_completed'
  ) THEN
    ALTER TABLE user_assistant_preferences ADD COLUMN member_onboarding_completed boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Enable realtime for user_priorities
ALTER PUBLICATION supabase_realtime ADD TABLE user_priorities;
