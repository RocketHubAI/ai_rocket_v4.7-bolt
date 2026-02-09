/*
  # N8N Integration Tables

  1. New Tables
    - `n8n_user_access`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `is_enabled` (boolean, default false)
      - `access_level` (text, 'full' or 'restricted')
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `n8n_workflows`
      - `id` (uuid, primary key)
      - `n8n_workflow_id` (text, N8N's workflow ID)
      - `user_id` (uuid, references auth.users)
      - `team_id` (uuid, references teams)
      - `name` (text)
      - `description` (text)
      - `is_active` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Users can only access their own workflows
    - Super admins can access everything
    - Only enabled users can access N8N features
*/

-- Create n8n_user_access table
CREATE TABLE IF NOT EXISTS n8n_user_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  is_enabled boolean DEFAULT false NOT NULL,
  access_level text DEFAULT 'full' CHECK (access_level IN ('full', 'restricted')),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id)
);

-- Create n8n_workflows table
CREATE TABLE IF NOT EXISTS n8n_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  n8n_workflow_id text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(n8n_workflow_id)
);

-- Enable RLS
ALTER TABLE n8n_user_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE n8n_workflows ENABLE ROW LEVEL SECURITY;

-- RLS Policies for n8n_user_access
CREATE POLICY "Users can view own N8N access"
  ON n8n_user_access FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR is_super_admin());

CREATE POLICY "Super admins can manage N8N access"
  ON n8n_user_access FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- RLS Policies for n8n_workflows
CREATE POLICY "Users can view own workflows"
  ON n8n_workflows FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR is_super_admin()
    OR (
      team_id IS NOT NULL
      AND team_id IN (
        SELECT team_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create own workflows"
  ON n8n_workflows FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM n8n_user_access
      WHERE user_id = auth.uid()
      AND is_enabled = true
    )
  );

CREATE POLICY "Users can update own workflows"
  ON n8n_workflows FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR is_super_admin())
  WITH CHECK (auth.uid() = user_id OR is_super_admin());

CREATE POLICY "Users can delete own workflows"
  ON n8n_workflows FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR is_super_admin());

-- Create indexes
CREATE INDEX idx_n8n_user_access_user_id ON n8n_user_access(user_id);
CREATE INDEX idx_n8n_user_access_enabled ON n8n_user_access(is_enabled);
CREATE INDEX idx_n8n_workflows_user_id ON n8n_workflows(user_id);
CREATE INDEX idx_n8n_workflows_team_id ON n8n_workflows(team_id);
CREATE INDEX idx_n8n_workflows_n8n_id ON n8n_workflows(n8n_workflow_id);

-- Grant initial access to clay@rockethub.ai
INSERT INTO n8n_user_access (user_id, is_enabled, access_level)
SELECT id, true, 'full'
FROM auth.users
WHERE email = 'clay@rockethub.ai'
ON CONFLICT (user_id) DO UPDATE
SET is_enabled = true, access_level = 'full', updated_at = now();
