/*
  # Add User-Specific Team Dashboard Snapshots

  1. Changes
    - Add target_user_id column to team_dashboard_snapshots
    - NULL = team-wide snapshot (for reference/admins)
    - NOT NULL = user-specific snapshot filtered by their category access
    - Add index for efficient user-specific snapshot lookups

  2. Benefits
    - Each user gets a personalized dashboard
    - Dashboard respects user's category access settings
    - Team admins can still see full team dashboard
    - Maintains backward compatibility with existing snapshots (NULL target_user_id)

  3. Index
    - Added for fast lookup of current user-specific snapshot
*/

ALTER TABLE team_dashboard_snapshots
ADD COLUMN IF NOT EXISTS target_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_team_dashboard_snapshots_user_current 
ON team_dashboard_snapshots(team_id, target_user_id, is_current) 
WHERE is_current = true;

COMMENT ON COLUMN team_dashboard_snapshots.target_user_id IS 
'NULL for team-wide snapshots, user ID for personalized snapshots filtered by category access';
