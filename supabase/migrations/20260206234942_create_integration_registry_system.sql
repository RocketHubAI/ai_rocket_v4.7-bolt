/*
  # Create Integration Registry System

  1. New Tables
    - `integration_registry`
      - `id` (uuid, primary key) - Unique identifier
      - `provider_slug` (text, unique) - URL-safe identifier like 'google-calendar', 'quickbooks'
      - `provider_name` (text) - Display name like 'Google Calendar'
      - `provider_logo_url` (text) - URL to provider logo
      - `provider_description` (text) - Brief description
      - `provider_category` (text) - Category: calendar, crm, project_management, communication, accounting, storage, analytics, transcription, custom
      - `auth_type` (text) - How it connects: oauth2, api_key, n8n_workflow, mcp
      - `oauth_scopes` (text[]) - Required OAuth scopes if applicable
      - `capabilities` (text[]) - What the integration can do
      - `capability_descriptions` (jsonb) - Human-readable descriptions
      - `status` (text) - available, beta, coming_soon, deprecated
      - `requires_admin` (boolean) - Whether only admins can connect
      - `n8n_workflow_id` (text) - Associated n8n workflow if applicable
      - `n8n_webhook_url` (text) - Associated n8n webhook if applicable
      - `mcp_server_url` (text) - MCP server URL if applicable
      - `setup_instructions` (text) - Instructions for connection setup
      - `sort_order` (integer) - Display order
      - `created_at` / `updated_at` (timestamptz)

    - `user_integrations`
      - `id` (uuid, primary key)
      - `user_id` (uuid) - User who connected
      - `team_id` (uuid) - Team context
      - `integration_id` (uuid) - Which integration
      - Encrypted credential fields (access_token, refresh_token, api_key)
      - `token_expires_at` (timestamptz)
      - `connected_account_email` / `connected_account_name` (text)
      - `connection_metadata` (jsonb)
      - `status` (text) - active, expired, error, disconnected, pending_setup
      - Agent usage tracking (times_used_by_agent, last_agent_use_at)
      - `created_at` / `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - integration_registry: All authenticated users can read (catalog)
    - user_integrations: Users can only manage their own, team members can view team connections
    - Super admins can view all integrations

  3. Indexes
    - integration_registry: category, status
    - user_integrations: user_id, team_id, unique(user_id, integration_id)
*/

CREATE TABLE IF NOT EXISTS integration_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_slug text UNIQUE NOT NULL,
  provider_name text NOT NULL,
  provider_logo_url text,
  provider_description text,
  provider_category text NOT NULL CHECK (provider_category IN (
    'calendar', 'crm', 'project_management', 'communication',
    'accounting', 'storage', 'analytics', 'transcription', 'custom'
  )),
  auth_type text NOT NULL CHECK (auth_type IN ('oauth2', 'api_key', 'n8n_workflow', 'mcp')),
  oauth_scopes text[] DEFAULT '{}',
  capabilities text[] NOT NULL DEFAULT '{}',
  capability_descriptions jsonb DEFAULT '{}',
  status text NOT NULL DEFAULT 'coming_soon' CHECK (status IN (
    'available', 'beta', 'coming_soon', 'deprecated'
  )),
  requires_admin boolean DEFAULT false,
  n8n_workflow_id text,
  n8n_webhook_url text,
  mcp_server_url text,
  setup_instructions text,
  sort_order integer DEFAULT 100,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_integration_registry_category ON integration_registry(provider_category);
CREATE INDEX IF NOT EXISTS idx_integration_registry_status ON integration_registry(status);

ALTER TABLE integration_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view integration catalog"
  ON integration_registry FOR SELECT
  TO authenticated
  USING (true);

CREATE TABLE IF NOT EXISTS user_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  team_id uuid REFERENCES teams(id),
  integration_id uuid NOT NULL REFERENCES integration_registry(id),
  access_token_encrypted text,
  refresh_token_encrypted text,
  api_key_encrypted text,
  token_expires_at timestamptz,
  connected_account_email text,
  connected_account_name text,
  connection_metadata jsonb DEFAULT '{}',
  status text NOT NULL DEFAULT 'active' CHECK (status IN (
    'active', 'expired', 'error', 'disconnected', 'pending_setup'
  )),
  last_error text,
  last_used_at timestamptz,
  last_synced_at timestamptz,
  times_used_by_agent integer DEFAULT 0,
  last_agent_use_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, integration_id)
);

CREATE INDEX IF NOT EXISTS idx_user_integrations_user_id ON user_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_integrations_team_id ON user_integrations(team_id);
CREATE INDEX IF NOT EXISTS idx_user_integrations_status ON user_integrations(status);

ALTER TABLE user_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own integrations"
  ON user_integrations FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Team members can view team integrations"
  ON user_integrations FOR SELECT
  TO authenticated
  USING (
    team_id IN (
      SELECT team_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can connect integrations"
  ON user_integrations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own integrations"
  ON user_integrations FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can disconnect own integrations"
  ON user_integrations FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Super admins can view all integrations"
  ON user_integrations FOR SELECT
  TO authenticated
  USING (is_super_admin());