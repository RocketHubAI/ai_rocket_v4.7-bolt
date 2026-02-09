/*
  # Fix user_drive_connections team_id foreign key constraint
  
  ## Problem
  The UNIQUE constraint on team_id prevents multiple users from the same team 
  from connecting their individual Google Drive accounts. This is too restrictive.
  
  ## Changes
  1. Drop the UNIQUE constraint on team_id
  2. Keep the foreign key constraint but make it more flexible
  3. Allow multiple users from the same team to have their own Drive connections
  
  ## Rationale
  - Each user should be able to connect their personal Google Drive
  - Multiple team members should be able to connect their own accounts
  - team_id is for grouping/filtering, not for enforcing one-per-team
*/

-- Drop the unique constraint on team_id
-- This allows multiple users from the same team to each have their own Google Drive connection
ALTER TABLE user_drive_connections 
  DROP CONSTRAINT IF EXISTS user_drive_connections_team_id_key;

-- The UNIQUE constraint on user_id remains (one connection per user)
-- The foreign key to teams remains (validates team_id exists if provided)

COMMENT ON TABLE user_drive_connections IS 'Stores per-user Google Drive OAuth credentials. Multiple users from the same team can each have their own connection.';
