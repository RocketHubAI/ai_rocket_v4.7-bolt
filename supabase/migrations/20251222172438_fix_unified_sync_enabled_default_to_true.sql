/*
  # Fix unified_sync_enabled default to true

  1. Changes
    - Change the default value of unified_sync_enabled from false to true
    - All new drive connections will now have unified sync enabled by default
*/

ALTER TABLE user_drive_connections 
ALTER COLUMN unified_sync_enabled SET DEFAULT true;