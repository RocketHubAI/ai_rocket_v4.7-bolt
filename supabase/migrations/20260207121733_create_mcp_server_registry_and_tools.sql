/*
  # Create MCP Server Registry and Tools System (Phase 4)

  1. New Tables
    - `mcp_servers` - Registry of MCP servers connected by teams
      - `id` (uuid, primary key)
      - `team_id` (uuid) - Which team owns this server
      - `name` (text) - Human-readable name
      - `slug` (text) - URL-safe identifier
      - `server_type` (text) - n8n, custom_api, zapier, hosted
      - `server_url` (text) - MCP server endpoint URL
      - `description` (text) - What this server provides
      - `status` (text) - active, inactive, error, pending_approval
      - `auth_type` (text) - api_key, bearer_token, oauth2, none
      - `auth_config` (jsonb) - Encrypted auth configuration
      - `capabilities` (text[]) - List of capability types
      - `metadata` (jsonb) - Extra config and settings
      - `last_health_check_at` (timestamptz) - Last successful ping
      - `health_status` (text) - healthy, degraded, unreachable
      - `tools_count` (integer) - Cached count of discovered tools
      - `added_by` (uuid) - User who added this server
      - `created_at` / `updated_at` (timestamptz)

    - `mcp_tools` - Tools discovered from MCP servers
      - `id` (uuid, primary key)
      - `server_id` (uuid) - Which server provides this tool
      - `team_id` (uuid) - Team context
      - `tool_name` (text) - Technical name from MCP schema
      - `display_name` (text) - Human-friendly name
      - `description` (text) - What this tool does
      - `input_schema` (jsonb) - JSON Schema for tool parameters
      - `output_schema` (jsonb) - Expected output format
      - `category` (text) - Tool category for discovery
      - `is_enabled` (boolean) - Whether team has enabled this tool
      - `is_read_only` (boolean) - Whether tool only reads data
      - `requires_approval` (boolean) - Needs admin approval before use
      - `usage_count` (integer) - Times this tool has been called
      - `last_used_at` (timestamptz) - Last successful execution
      - `avg_execution_ms` (integer) - Average execution time
      - `created_at` / `updated_at` (timestamptz)

    - `mcp_tool_executions` - Audit log of tool executions
      - `id` (uuid, primary key)
      - `tool_id` (uuid) - Which tool was called
      - `server_id` (uuid) - Which server handled it
      - `user_id` (uuid) - Who triggered it
      - `team_id` (uuid) - Team context
      - `input_params` (jsonb) - Parameters sent
      - `output_result` (jsonb) - Result received
      - `status` (text) - success, error, timeout, rejected
      - `execution_time_ms` (integer) - How long it took
      - `error_message` (text) - Error details if failed
      - `triggered_by` (text) - agent_auto, agent_suggested, user_manual
      - `conversation_id` (text) - Chat context if applicable
      - `created_at` (timestamptz)

  2. Security
    - RLS enabled on all tables
    - Team members can view their team's servers and tools
    - Only admins can add/modify servers
    - All users can view tool execution history for their own executions
    - Super admins can view everything

  3. Indexes
    - Optimized for team-based queries and tool discovery
*/

-- MCP Servers table
CREATE TABLE IF NOT EXISTS mcp_servers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id),
  name text NOT NULL,
  slug text NOT NULL,
  server_type text NOT NULL DEFAULT 'custom_api' CHECK (server_type IN (
    'n8n', 'custom_api', 'zapier', 'hosted', 'local'
  )),
  server_url text,
  description text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN (
    'active', 'inactive', 'error', 'pending_approval'
  )),
  auth_type text NOT NULL DEFAULT 'none' CHECK (auth_type IN (
    'api_key', 'bearer_token', 'oauth2', 'none'
  )),
  auth_config jsonb DEFAULT '{}'::jsonb,
  capabilities text[] DEFAULT '{}',
  metadata jsonb DEFAULT '{}'::jsonb,
  last_health_check_at timestamptz,
  health_status text DEFAULT 'healthy' CHECK (health_status IN (
    'healthy', 'degraded', 'unreachable', 'unknown'
  )),
  tools_count integer DEFAULT 0,
  added_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(team_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_mcp_servers_team_id ON mcp_servers(team_id);
CREATE INDEX IF NOT EXISTS idx_mcp_servers_status ON mcp_servers(status);
CREATE INDEX IF NOT EXISTS idx_mcp_servers_type ON mcp_servers(server_type);

ALTER TABLE mcp_servers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view their servers"
  ON mcp_servers FOR SELECT
  TO authenticated
  USING (
    team_id IN (SELECT team_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Admins can add servers"
  ON mcp_servers FOR INSERT
  TO authenticated
  WITH CHECK (
    team_id IN (SELECT team_id FROM users WHERE id = auth.uid())
    AND (
      (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
      OR added_by = auth.uid()
    )
  );

CREATE POLICY "Admins can update servers"
  ON mcp_servers FOR UPDATE
  TO authenticated
  USING (
    team_id IN (SELECT team_id FROM users WHERE id = auth.uid())
    AND (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  )
  WITH CHECK (
    team_id IN (SELECT team_id FROM users WHERE id = auth.uid())
    AND (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "Admins can delete servers"
  ON mcp_servers FOR DELETE
  TO authenticated
  USING (
    team_id IN (SELECT team_id FROM users WHERE id = auth.uid())
    AND (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "Super admins can view all servers"
  ON mcp_servers FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'email') IN (
      'clay@rockethub.ai', 'john@rockethub.ai'
    )
  );

-- MCP Tools table
CREATE TABLE IF NOT EXISTS mcp_tools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id uuid NOT NULL REFERENCES mcp_servers(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES teams(id),
  tool_name text NOT NULL,
  display_name text NOT NULL,
  description text,
  input_schema jsonb DEFAULT '{}'::jsonb,
  output_schema jsonb DEFAULT '{}'::jsonb,
  category text DEFAULT 'general',
  is_enabled boolean DEFAULT true,
  is_read_only boolean DEFAULT true,
  requires_approval boolean DEFAULT false,
  usage_count integer DEFAULT 0,
  last_used_at timestamptz,
  avg_execution_ms integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(server_id, tool_name)
);

CREATE INDEX IF NOT EXISTS idx_mcp_tools_server_id ON mcp_tools(server_id);
CREATE INDEX IF NOT EXISTS idx_mcp_tools_team_id ON mcp_tools(team_id);
CREATE INDEX IF NOT EXISTS idx_mcp_tools_enabled ON mcp_tools(is_enabled) WHERE is_enabled = true;
CREATE INDEX IF NOT EXISTS idx_mcp_tools_category ON mcp_tools(category);

ALTER TABLE mcp_tools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view their tools"
  ON mcp_tools FOR SELECT
  TO authenticated
  USING (
    team_id IN (SELECT team_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Admins can manage tools"
  ON mcp_tools FOR INSERT
  TO authenticated
  WITH CHECK (
    team_id IN (SELECT team_id FROM users WHERE id = auth.uid())
    AND (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "Admins can update tools"
  ON mcp_tools FOR UPDATE
  TO authenticated
  USING (
    team_id IN (SELECT team_id FROM users WHERE id = auth.uid())
    AND (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  )
  WITH CHECK (
    team_id IN (SELECT team_id FROM users WHERE id = auth.uid())
    AND (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "Admins can delete tools"
  ON mcp_tools FOR DELETE
  TO authenticated
  USING (
    team_id IN (SELECT team_id FROM users WHERE id = auth.uid())
    AND (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "Super admins can view all tools"
  ON mcp_tools FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'email') IN (
      'clay@rockethub.ai', 'john@rockethub.ai'
    )
  );

-- MCP Tool Executions table
CREATE TABLE IF NOT EXISTS mcp_tool_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id uuid REFERENCES mcp_tools(id) ON DELETE SET NULL,
  server_id uuid REFERENCES mcp_servers(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  team_id uuid REFERENCES teams(id),
  input_params jsonb DEFAULT '{}'::jsonb,
  output_result jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'running', 'success', 'error', 'timeout', 'rejected'
  )),
  execution_time_ms integer,
  error_message text,
  triggered_by text NOT NULL DEFAULT 'agent_auto' CHECK (triggered_by IN (
    'agent_auto', 'agent_suggested', 'user_manual', 'system_cron'
  )),
  conversation_id text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mcp_executions_user_id ON mcp_tool_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_mcp_executions_team_id ON mcp_tool_executions(team_id);
CREATE INDEX IF NOT EXISTS idx_mcp_executions_tool_id ON mcp_tool_executions(tool_id);
CREATE INDEX IF NOT EXISTS idx_mcp_executions_status ON mcp_tool_executions(status);
CREATE INDEX IF NOT EXISTS idx_mcp_executions_created_at ON mcp_tool_executions(created_at DESC);

ALTER TABLE mcp_tool_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own executions"
  ON mcp_tool_executions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Team members can view team executions"
  ON mcp_tool_executions FOR SELECT
  TO authenticated
  USING (
    team_id IN (SELECT team_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "System can insert executions"
  ON mcp_tool_executions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Super admins can view all executions"
  ON mcp_tool_executions FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'email') IN (
      'clay@rockethub.ai', 'john@rockethub.ai'
    )
  );

-- Function to update tool usage stats after execution
CREATE OR REPLACE FUNCTION update_mcp_tool_usage_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'success' AND NEW.tool_id IS NOT NULL THEN
    UPDATE mcp_tools
    SET 
      usage_count = usage_count + 1,
      last_used_at = now(),
      avg_execution_ms = CASE 
        WHEN usage_count = 0 THEN COALESCE(NEW.execution_time_ms, 0)
        ELSE ((avg_execution_ms * usage_count) + COALESCE(NEW.execution_time_ms, 0)) / (usage_count + 1)
      END,
      updated_at = now()
    WHERE id = NEW.tool_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_update_mcp_tool_usage'
  ) THEN
    CREATE TRIGGER trg_update_mcp_tool_usage
    AFTER INSERT OR UPDATE ON mcp_tool_executions
    FOR EACH ROW
    EXECUTE FUNCTION update_mcp_tool_usage_stats();
  END IF;
END $$;