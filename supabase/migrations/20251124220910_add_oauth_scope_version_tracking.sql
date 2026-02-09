/*
  # Add OAuth scope version tracking
  
  1. Problem
    - When we add new OAuth scopes (like Google Sheets), existing tokens don't have the new permissions
    - Users get 403 errors when trying to use features that require the new scopes
    - We need a way to detect outdated tokens and prompt users to reconnect
    
  2. Solution
    - Add a scope_version field to user_drive_connections
    - Set current version to 2 (version 1 = without Sheets, version 2 = with Sheets)
    - Application can check if token has latest scope version
    - If not, prompt user to reconnect
    
  3. Changes
    - Add scope_version column (defaults to 2 for new connections)
    - Update existing connections to version 1 (they need to reconnect)
    - Add helper function to check if reconnection is needed
*/

-- Add scope_version column to track OAuth scope changes
ALTER TABLE user_drive_connections 
ADD COLUMN IF NOT EXISTS scope_version integer DEFAULT 2;

-- Mark all existing connections as version 1 (need reconnection for Sheets access)
UPDATE user_drive_connections 
SET scope_version = 1 
WHERE scope_version IS NULL OR scope_version = 2;

-- Create function to check if reconnection is needed
CREATE OR REPLACE FUNCTION needs_oauth_reconnection(user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_version integer;
  required_version integer := 2; -- Current required version (includes Sheets scope)
BEGIN
  -- Get the user's current scope version
  SELECT scope_version INTO current_version
  FROM user_drive_connections
  WHERE user_id = user_uuid
    AND is_active = true
  LIMIT 1;
  
  -- If no connection or version is outdated, reconnection is needed
  RETURN (current_version IS NULL OR current_version < required_version);
END;
$$;

COMMENT ON COLUMN user_drive_connections.scope_version IS 'OAuth scope version: 1=original scopes, 2=added Sheets scope';
COMMENT ON FUNCTION needs_oauth_reconnection IS 'Returns true if user needs to reconnect OAuth due to scope changes';
