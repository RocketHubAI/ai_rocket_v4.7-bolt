/*
  # Mark All Google Drive Connections as Expired for OAuth Migration

  ## Purpose
  We have migrated to a new Google-verified OAuth application. All existing refresh tokens
  from the old OAuth app are no longer valid and cannot be refreshed with the new credentials.
  This migration marks all active connections as expired to trigger the reconnection flow.

  ## Changes
  1. Updates all active `user_drive_connections` records:
     - Sets `connection_status` to 'token_expired'
     - Sets `scope_version` to 3 (indicating new OAuth app migration)
  
  2. This preserves all folder configurations and settings - users only need to re-authorize

  ## User Experience
  - Users will see a reconnection prompt when they open the app
  - After reconnecting, their existing folder selections will be preserved
  - Document sync will resume automatically after reconnection

  ## Notes
  - The old OAuth app was NOT revoked, so we can still use alternate OAuth for specific users if needed
  - Users on the alternate OAuth app (oauth_app_id = 'alternate') will also be migrated to new primary app
*/

-- Mark all active connections as expired and bump scope_version
UPDATE user_drive_connections
SET 
  connection_status = 'token_expired',
  scope_version = 3,
  updated_at = now()
WHERE is_active = true;

-- Log the migration in token_refresh_logs for tracking
INSERT INTO token_refresh_logs (user_id, team_id, service, refresh_attempt_at, success, error_code, error_message, created_at)
SELECT 
  user_id,
  team_id,
  'google_drive',
  now(),
  false,
  'OAUTH_MIGRATION',
  'Connection marked expired due to OAuth app migration to Google-verified application',
  now()
FROM user_drive_connections
WHERE is_active = true;
