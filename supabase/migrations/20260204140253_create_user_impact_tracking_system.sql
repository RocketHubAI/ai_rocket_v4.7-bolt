/*
  # User Impact Tracking System

  1. New Tables
    - `user_impact_items` - Master list of impact features ranked by priority
      - `id` (uuid, primary key)
      - `feature_key` (text, unique) - Unique identifier for the feature
      - `feature_name` (text) - Display name
      - `feature_description` (text) - Description of the impact
      - `priority_rank` (integer) - Default priority order (1 = highest)
      - `category` (text) - Feature category
      - `is_active` (boolean) - Whether this item is currently active
      - `created_at` (timestamptz)

    - `user_impact_progress` - Tracks user completion of impact items
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `team_id` (uuid, references teams)
      - `feature_key` (text) - References user_impact_items.feature_key
      - `is_completed` (boolean) - Whether user has completed this
      - `completed_at` (timestamptz) - When it was completed
      - `custom_priority` (integer) - AI-adjusted priority for this user
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `user_onboarding_education` - Tracks educational prompts user has seen
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `education_key` (text) - 'capabilities', 'security', 'skipped'
      - `viewed_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Users can read/update their own progress
    - Admins can update team members' custom priorities

  3. Seed Data
    - Initial impact items ranked by priority
*/

-- Create user_impact_items table (master list)
CREATE TABLE IF NOT EXISTS user_impact_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key text UNIQUE NOT NULL,
  feature_name text NOT NULL,
  feature_description text NOT NULL,
  priority_rank integer NOT NULL DEFAULT 100,
  category text NOT NULL DEFAULT 'general',
  action_prompt text,
  action_type text,
  action_target text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_impact_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read impact items"
  ON user_impact_items FOR SELECT
  TO authenticated
  USING (true);

-- Create user_impact_progress table
CREATE TABLE IF NOT EXISTS user_impact_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  feature_key text NOT NULL REFERENCES user_impact_items(feature_key) ON DELETE CASCADE,
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  custom_priority integer,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, feature_key)
);

ALTER TABLE user_impact_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own impact progress"
  ON user_impact_progress FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own impact progress"
  ON user_impact_progress FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own impact progress"
  ON user_impact_progress FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Super admins can manage all impact progress"
  ON user_impact_progress FOR ALL
  TO authenticated
  USING (is_super_admin());

-- Create user_onboarding_education table
CREATE TABLE IF NOT EXISTS user_onboarding_education (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  education_key text NOT NULL,
  viewed_at timestamptz DEFAULT now(),
  UNIQUE(user_id, education_key)
);

ALTER TABLE user_onboarding_education ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own education progress"
  ON user_onboarding_education FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own education progress"
  ON user_onboarding_education FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Seed the impact items in priority order
INSERT INTO user_impact_items (feature_key, feature_name, feature_description, priority_rank, category, action_type, action_target) VALUES
  ('sync_documents', 'Sync Your Documents', 'Connect Google Drive or OneDrive to power AI Rocket with your team''s knowledge', 1, 'data', 'trigger_sync', 'fuel-stage'),
  ('run_first_report', 'Generate Your First AI Report', 'Create an AI-powered report to see insights from your synced data', 2, 'reports', 'navigate', 'reports'),
  ('schedule_report', 'Schedule Automated Reports', 'Set up recurring reports delivered to your inbox automatically', 3, 'reports', 'navigate', 'reports'),
  ('invite_team_member', 'Invite a Team Member', 'Add teammates to collaborate and share AI insights together', 4, 'team', 'open_modal', 'invite-member'),
  ('create_visualization', 'Create a Visualization', 'Turn your data into charts and visual insights', 5, 'visualizations', 'navigate', 'visualizations'),
  ('view_team_dashboard', 'View Team Dashboard', 'Check your AI-generated daily team health snapshot', 6, 'dashboard', 'navigate', 'team-dashboard'),
  ('create_presentation', 'Create a Presentation', 'Generate slides and infographics from your team''s data', 7, 'creative', 'navigate', 'astra-create'),
  ('view_team_pulse', 'Generate Team Pulse', 'Create a beautiful AI infographic of team activity', 8, 'creative', 'navigate', 'team-pulse'),
  ('ask_data_question', 'Ask a Question About Your Data', 'Use natural language to search across all your documents', 9, 'search', 'none', null),
  ('customize_agent', 'Customize Agent Personality', 'Fine-tune how the AI assistant communicates with your team', 10, 'settings', 'none', null),
  ('upload_local_files', 'Upload Local Files', 'Add documents directly without cloud storage connection', 11, 'data', 'navigate', 'fuel-stage'),
  ('use_team_chat', 'Use Team Chat', 'Collaborate with team members in real-time group chat', 12, 'team', 'navigate', 'team')
ON CONFLICT (feature_key) DO UPDATE SET
  feature_name = EXCLUDED.feature_name,
  feature_description = EXCLUDED.feature_description,
  priority_rank = EXCLUDED.priority_rank,
  category = EXCLUDED.category,
  action_type = EXCLUDED.action_type,
  action_target = EXCLUDED.action_target;

-- Function to auto-initialize user impact progress when they join
CREATE OR REPLACE FUNCTION initialize_user_impact_progress()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_impact_progress (user_id, team_id, feature_key, custom_priority)
  SELECT 
    NEW.id,
    NEW.team_id,
    i.feature_key,
    i.priority_rank
  FROM user_impact_items i
  WHERE i.is_active = true
  ON CONFLICT (user_id, feature_key) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_user_created_init_impact ON public.users;
CREATE TRIGGER on_user_created_init_impact
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION initialize_user_impact_progress();

-- Initialize existing users
INSERT INTO user_impact_progress (user_id, team_id, feature_key, custom_priority)
SELECT 
  u.id,
  u.team_id,
  i.feature_key,
  i.priority_rank
FROM public.users u
CROSS JOIN user_impact_items i
WHERE u.team_id IS NOT NULL AND i.is_active = true
ON CONFLICT (user_id, feature_key) DO NOTHING;