/*
  # Seed n8n as Default MCP Server for All Teams

  1. Purpose
    - Registers the n8n automation platform as a built-in MCP server for every team
    - This makes all deployed n8n workflows automatically discoverable as tools
    - Each team gets their own entry pointing to the shared n8n instance

  2. Changes
    - Creates a function to auto-register n8n server for existing teams
    - Creates a trigger to register n8n server for new teams
    - Backfills n8n server for all existing teams

  3. Notes
    - The n8n API URL and key are stored in edge function environment variables
    - Server metadata stores the API URL for the sync function
    - Auth config stores the API key reference (actual key is in env vars)
    - Tool discovery happens when sync_tools is called via the mcp-client edge function
*/

-- Function to register n8n server for a team
CREATE OR REPLACE FUNCTION register_default_mcp_servers_for_team(p_team_id uuid, p_user_id uuid DEFAULT NULL)
RETURNS void AS $$
BEGIN
  INSERT INTO mcp_servers (
    team_id, name, slug, server_type, server_url, description, status,
    auth_type, auth_config, capabilities, metadata, health_status, added_by
  ) VALUES (
    p_team_id,
    'n8n Automation Hub',
    'n8n-hub',
    'n8n',
    'https://healthrocket.app.n8n.cloud',
    'Built-in automation server connecting to 400+ business apps via n8n workflows. Includes pre-built integrations for QuickBooks, Slack, HubSpot, Salesforce, Notion, and more.',
    'active',
    'api_key',
    '{"source": "environment_variable", "env_key": "N8N_API_KEY"}'::jsonb,
    ARRAY['query_data', 'sync_data', 'automation', 'webhook'],
    jsonb_build_object(
      'api_url', 'https://healthrocket.app.n8n.cloud',
      'webhook_base_url', 'https://healthrocket.app.n8n.cloud/webhook',
      'is_built_in', true,
      'auto_sync', true
    ),
    'unknown',
    p_user_id
  )
  ON CONFLICT (team_id, slug) DO UPDATE SET
    description = EXCLUDED.description,
    capabilities = EXCLUDED.capabilities,
    metadata = EXCLUDED.metadata,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function for new teams
CREATE OR REPLACE FUNCTION auto_register_mcp_servers_on_team_create()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM register_default_mcp_servers_for_team(NEW.id, NEW.created_by);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_auto_register_mcp_servers'
  ) THEN
    CREATE TRIGGER trg_auto_register_mcp_servers
    AFTER INSERT ON teams
    FOR EACH ROW
    EXECUTE FUNCTION auto_register_mcp_servers_on_team_create();
  END IF;
END $$;

-- Backfill: register n8n for all existing teams
INSERT INTO mcp_servers (
  team_id, name, slug, server_type, server_url, description, status,
  auth_type, auth_config, capabilities, metadata, health_status
)
SELECT
  t.id,
  'n8n Automation Hub',
  'n8n-hub',
  'n8n',
  'https://healthrocket.app.n8n.cloud',
  'Built-in automation server connecting to 400+ business apps via n8n workflows. Includes pre-built integrations for QuickBooks, Slack, HubSpot, Salesforce, Notion, and more.',
  'active',
  'api_key',
  '{"source": "environment_variable", "env_key": "N8N_API_KEY"}'::jsonb,
  ARRAY['query_data', 'sync_data', 'automation', 'webhook'],
  jsonb_build_object(
    'api_url', 'https://healthrocket.app.n8n.cloud',
    'webhook_base_url', 'https://healthrocket.app.n8n.cloud/webhook',
    'is_built_in', true,
    'auto_sync', true
  ),
  'unknown'
FROM teams t
ON CONFLICT (team_id, slug) DO NOTHING;