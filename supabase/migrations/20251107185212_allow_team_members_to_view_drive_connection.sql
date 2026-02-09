/*
  # Allow Team Members to View Team Drive Connection
  
  1. Changes
    - Adds RLS policy allowing all team members to view their team's Drive connection
    - Non-admins can only view, not modify (admins can still connect/disconnect)
  
  2. Security
    - Users can only see connections for their own team
    - Maintains write restrictions (only connection owner can modify)
    - Ensures all team members can see sync status and folder configuration
*/

-- RLS Policy: Team members can view their team's drive connection
CREATE POLICY "Team members can view team drive connection"
  ON user_drive_connections
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.team_id = user_drive_connections.team_id
    )
  );

COMMENT ON POLICY "Team members can view team drive connection" ON user_drive_connections IS 
'Allows all team members to view their team''s Google Drive connection status and configuration, regardless of role';
