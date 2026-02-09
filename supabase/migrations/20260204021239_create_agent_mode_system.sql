/*
  # Create Agent Mode System

  This migration sets up the database infrastructure for the Agent Mode feature,
  which provides an intelligent team agent with a split-screen interface.

  1. New Tables
    - `team_agent_settings`
      - `team_id` (uuid, primary key, references teams)
      - `agent_name` (text, default 'Astra')
      - `agent_personality` (jsonb, optional future customizations)
      - `onboarding_completed` (boolean, default false)
      - `created_at`, `updated_at` (timestamptz)
    
    - `agent_conversations`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `team_id` (uuid, references teams)
      - `role` (text, 'user' or 'agent')
      - `message` (text)
      - `metadata` (jsonb, stores context, actions, onboarding state)
      - `created_at` (timestamptz)
    
    - `team_agent_context`
      - `id` (uuid, primary key)
      - `team_id` (uuid, references teams)
      - `context_type` (text, 'mission', 'values', 'goals', 'preferences')
      - `context_value` (text)
      - `source` (text, 'conversation', 'documents')
      - `created_at` (timestamptz)

  2. Feature Flag
    - Enable `agent_mode` for clay@rockethub.ai

  3. Security
    - RLS enabled on all tables
    - Team members can view their agent settings
    - Team admins can edit agent settings
    - Users can manage their own conversations
    - Team members can view shared context
*/

-- Create team_agent_settings table
CREATE TABLE IF NOT EXISTS team_agent_settings (
  team_id uuid PRIMARY KEY REFERENCES teams(id) ON DELETE CASCADE,
  agent_name text NOT NULL DEFAULT 'Astra',
  agent_personality jsonb DEFAULT '{}'::jsonb,
  onboarding_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE team_agent_settings ENABLE ROW LEVEL SECURITY;

-- Team members can view their team's agent settings
CREATE POLICY "Team members can view agent settings"
  ON team_agent_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.team_id = team_agent_settings.team_id
    )
  );

-- Team admins can manage agent settings
CREATE POLICY "Team admins can insert agent settings"
  ON team_agent_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.team_id = team_agent_settings.team_id
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Team admins can update agent settings"
  ON team_agent_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.team_id = team_agent_settings.team_id
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.team_id = team_agent_settings.team_id
      AND users.role = 'admin'
    )
  );

-- Super admins can manage all agent settings
CREATE POLICY "Super admins can manage all agent settings"
  ON team_agent_settings
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt()->>'email') IN (
      'clay@rockethub.ai',
      'john@rockethub.ai'
    )
  );

-- Create agent_conversations table
CREATE TABLE IF NOT EXISTS agent_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'agent')),
  message text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE agent_conversations ENABLE ROW LEVEL SECURITY;

-- Users can view their own conversations
CREATE POLICY "Users can view own agent conversations"
  ON agent_conversations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can create their own messages
CREATE POLICY "Users can create agent messages"
  ON agent_conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own conversations
CREATE POLICY "Users can delete own agent conversations"
  ON agent_conversations
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Super admins can view all conversations
CREATE POLICY "Super admins can view all agent conversations"
  ON agent_conversations
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->>'email') IN (
      'clay@rockethub.ai',
      'john@rockethub.ai'
    )
  );

-- Create team_agent_context table
CREATE TABLE IF NOT EXISTS team_agent_context (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  context_type text NOT NULL CHECK (context_type IN ('mission', 'values', 'goals', 'preferences', 'facts')),
  context_value text NOT NULL,
  source text NOT NULL DEFAULT 'conversation' CHECK (source IN ('conversation', 'documents', 'manual')),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE team_agent_context ENABLE ROW LEVEL SECURITY;

-- Team members can view their team's context
CREATE POLICY "Team members can view agent context"
  ON team_agent_context
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.team_id = team_agent_context.team_id
    )
  );

-- Team members can add context from conversations
CREATE POLICY "Team members can add agent context"
  ON team_agent_context
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.team_id = team_agent_context.team_id
    )
  );

-- Super admins can manage all context
CREATE POLICY "Super admins can manage all agent context"
  ON team_agent_context
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt()->>'email') IN (
      'clay@rockethub.ai',
      'john@rockethub.ai'
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_conversations_user_team 
  ON agent_conversations(user_id, team_id);

CREATE INDEX IF NOT EXISTS idx_agent_conversations_created 
  ON agent_conversations(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_team_agent_context_team_type 
  ON team_agent_context(team_id, context_type);

-- Enable agent_mode feature flag for clay@rockethub.ai
INSERT INTO feature_flags (email, feature_name, enabled)
VALUES ('clay@rockethub.ai', 'agent_mode', true)
ON CONFLICT DO NOTHING;

-- Create function to auto-create agent settings for new teams
CREATE OR REPLACE FUNCTION create_default_agent_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO team_agent_settings (team_id, agent_name)
  VALUES (NEW.id, 'Astra')
  ON CONFLICT (team_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-create agent settings
DROP TRIGGER IF EXISTS create_agent_settings_on_team_insert ON teams;
CREATE TRIGGER create_agent_settings_on_team_insert
  AFTER INSERT ON teams
  FOR EACH ROW
  EXECUTE FUNCTION create_default_agent_settings();

-- Backfill agent settings for existing teams
INSERT INTO team_agent_settings (team_id, agent_name)
SELECT id, 'Astra' FROM teams
ON CONFLICT (team_id) DO NOTHING;

-- Enable realtime for agent conversations
ALTER PUBLICATION supabase_realtime ADD TABLE agent_conversations;