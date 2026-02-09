/*
  # Sync Legacy Drive Connections to User Integrations

  1. Purpose
    - Backfill existing Google Drive and Microsoft OneDrive connections 
      from the legacy `user_drive_connections` table into the unified 
      `user_integrations` table
    - Create a trigger to automatically sync new drive connections going forward
    - Ensures Connected Apps page shows accurate status for storage integrations

  2. Changes
    - Creates function `sync_drive_connection_to_integrations()` that mirrors 
      drive connection changes into user_integrations
    - Creates trigger on `user_drive_connections` for INSERT and UPDATE
    - Backfills all existing active drive connections

  3. Security
    - Function runs as SECURITY DEFINER to bypass RLS for system-level sync
    - No new tables created; leverages existing RLS on user_integrations
*/

CREATE OR REPLACE FUNCTION sync_drive_connection_to_integrations()
RETURNS TRIGGER AS $$
DECLARE
  v_integration_id uuid;
  v_provider_slug text;
BEGIN
  IF NEW.provider = 'google' THEN
    v_provider_slug := 'google-drive';
  ELSIF NEW.provider = 'microsoft' THEN
    v_provider_slug := 'microsoft-onedrive';
  ELSE
    RETURN NEW;
  END IF;

  SELECT id INTO v_integration_id
  FROM integration_registry
  WHERE provider_slug = v_provider_slug
  LIMIT 1;

  IF v_integration_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO user_integrations (
    user_id,
    team_id,
    integration_id,
    access_token_encrypted,
    refresh_token_encrypted,
    token_expires_at,
    connected_account_email,
    status,
    connection_metadata
  ) VALUES (
    NEW.user_id,
    NEW.team_id,
    v_integration_id,
    NEW.access_token,
    NEW.refresh_token,
    NEW.token_expires_at,
    COALESCE(NEW.google_account_email, NEW.microsoft_account_email),
    CASE WHEN NEW.is_active THEN 'active' ELSE 'disconnected' END,
    jsonb_build_object(
      'source', 'drive_connection_sync',
      'drive_connection_id', NEW.id,
      'provider', NEW.provider,
      'shared_credentials', true
    )
  )
  ON CONFLICT (user_id, integration_id)
  DO UPDATE SET
    access_token_encrypted = EXCLUDED.access_token_encrypted,
    refresh_token_encrypted = EXCLUDED.refresh_token_encrypted,
    token_expires_at = EXCLUDED.token_expires_at,
    connected_account_email = EXCLUDED.connected_account_email,
    status = EXCLUDED.status,
    connection_metadata = EXCLUDED.connection_metadata,
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_sync_drive_to_integrations'
  ) THEN
    CREATE TRIGGER trg_sync_drive_to_integrations
    AFTER INSERT OR UPDATE ON user_drive_connections
    FOR EACH ROW
    EXECUTE FUNCTION sync_drive_connection_to_integrations();
  END IF;
END $$;

INSERT INTO user_integrations (
  user_id,
  team_id,
  integration_id,
  access_token_encrypted,
  refresh_token_encrypted,
  token_expires_at,
  connected_account_email,
  status,
  connection_metadata
)
SELECT
  dc.user_id,
  dc.team_id,
  ir.id,
  dc.access_token,
  dc.refresh_token,
  dc.token_expires_at,
  COALESCE(dc.google_account_email, dc.microsoft_account_email),
  CASE WHEN dc.is_active THEN 'active' ELSE 'disconnected' END,
  jsonb_build_object(
    'source', 'backfill_sync',
    'drive_connection_id', dc.id,
    'provider', dc.provider,
    'shared_credentials', true
  )
FROM user_drive_connections dc
JOIN integration_registry ir ON (
  (dc.provider = 'google' AND ir.provider_slug = 'google-drive')
  OR (dc.provider = 'microsoft' AND ir.provider_slug = 'microsoft-onedrive')
)
WHERE dc.is_active = true
ON CONFLICT (user_id, integration_id) DO UPDATE SET
  access_token_encrypted = EXCLUDED.access_token_encrypted,
  refresh_token_encrypted = EXCLUDED.refresh_token_encrypted,
  token_expires_at = EXCLUDED.token_expires_at,
  connected_account_email = EXCLUDED.connected_account_email,
  status = EXCLUDED.status,
  connection_metadata = EXCLUDED.connection_metadata,
  updated_at = now();
