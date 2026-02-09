/*
  # Fix user_drive_connections unique constraint for multiple providers

  1. Changes
    - Drops the existing unique constraint on user_id alone
    - Creates a new unique constraint on (user_id, provider) combination
    - This allows each user to have one Google Drive connection AND one Microsoft OneDrive connection

  2. Security
    - No RLS changes needed
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_drive_connections_user_id_key'
  ) THEN
    ALTER TABLE user_drive_connections DROP CONSTRAINT user_drive_connections_user_id_key;
  END IF;
END $$;

ALTER TABLE user_drive_connections
ADD CONSTRAINT user_drive_connections_user_id_provider_key 
UNIQUE (user_id, provider);
