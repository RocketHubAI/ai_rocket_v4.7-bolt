/*
  # Enable Multi-Admin Drive Connections and Team Launch Points

  ## Overview
  This migration enables multiple admin users on the same team to connect their Google Drives,
  adds team-level launch points tracking, and adds feedback delay tracking.

  ## Changes

  ### 1. Google Drive Multi-Admin Support
  - Remove UNIQUE(team_id) constraint from user_drive_connections
  - Multiple admins can now connect their own Google Drives for the same team
  - Each user's folders are tracked independently via folder_sync_status
  - Workflow handles duplicate folder prevention

  ### 2. Team Launch Points Tracking
  - Add total_launch_points to teams table
  - Add launch_points_updated_at timestamp
  - Track team-wide progress for leaderboard
  - Real-time aggregation of team member points

  ### 3. Feedback Delay Tracking
  - Add welcome_completed_at to team_settings
  - Used to delay feedback prompts by 24 hours after welcome screen

  ## Notes
  - user_id UNIQUE constraint remains (one connection per user)
  - Team members will see all synced documents from all connected drives
  - Each user can only modify/disconnect their own drive connection
*/

-- 1. Remove team_id unique constraint from user_drive_connections
-- This allows multiple admin users to connect their drives for the same team
ALTER TABLE user_drive_connections
DROP CONSTRAINT IF EXISTS user_drive_connections_team_id_key;

-- 2. Add team launch points tracking to teams table
ALTER TABLE teams
ADD COLUMN IF NOT EXISTS total_launch_points INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS launch_points_updated_at TIMESTAMPTZ DEFAULT now();

-- Create index for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_teams_launch_points
  ON teams(total_launch_points DESC) WHERE total_launch_points > 0;

-- 3. Add welcome completion tracking to team_settings for feedback delay
ALTER TABLE team_settings
ADD COLUMN IF NOT EXISTS welcome_completed_at TIMESTAMPTZ;

-- 4. Create function to increment team launch points (for real-time aggregation)
CREATE OR REPLACE FUNCTION increment_team_launch_points(
  p_team_id UUID,
  p_points INTEGER
)
RETURNS VOID AS $$
BEGIN
  UPDATE teams
  SET
    total_launch_points = total_launch_points + p_points,
    launch_points_updated_at = now()
  WHERE id = p_team_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION increment_team_launch_points TO authenticated;

-- 5. Add helpful comments
COMMENT ON COLUMN teams.total_launch_points IS 'Aggregate launch points from all team members for leaderboard';
COMMENT ON COLUMN teams.launch_points_updated_at IS 'Timestamp of last points update';
COMMENT ON COLUMN team_settings.welcome_completed_at IS 'Timestamp when user completed welcome screen/tour - used to delay feedback prompts by 24 hours';
COMMENT ON COLUMN user_drive_connections.team_id IS 'Team ID - multiple admins can connect drives for same team';
