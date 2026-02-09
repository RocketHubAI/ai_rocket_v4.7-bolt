/*
  # Sync User Launch Points to Team Total

  ## Overview
  Automatically sync individual user launch points to team total_launch_points

  ## Changes
  1. Create trigger function to update team total when user points change
  2. Add trigger on user_launch_status for INSERT/UPDATE
  3. Backfill existing team totals from current user points

  ## Security
  - Function runs as SECURITY DEFINER to bypass RLS
  - Only updates team totals, no user-facing changes needed
*/

-- Create function to sync user points to team total
CREATE OR REPLACE FUNCTION sync_user_points_to_team()
RETURNS TRIGGER AS $$
DECLARE
  v_team_id UUID;
  v_team_total INTEGER;
BEGIN
  -- Get the user's team_id
  SELECT team_id INTO v_team_id
  FROM users
  WHERE id = NEW.user_id;

  -- If user has a team, calculate and update team total
  IF v_team_id IS NOT NULL THEN
    -- Calculate total points for all team members
    SELECT COALESCE(SUM(uls.total_points), 0) INTO v_team_total
    FROM users u
    LEFT JOIN user_launch_status uls ON u.id = uls.user_id
    WHERE u.team_id = v_team_id;

    -- Update team total
    UPDATE teams
    SET 
      total_launch_points = v_team_total,
      launch_points_updated_at = now()
    WHERE id = v_team_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on user_launch_status
DROP TRIGGER IF EXISTS trigger_sync_user_points_to_team ON user_launch_status;
CREATE TRIGGER trigger_sync_user_points_to_team
  AFTER INSERT OR UPDATE OF total_points ON user_launch_status
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_points_to_team();

-- Backfill existing team totals
UPDATE teams t
SET 
  total_launch_points = COALESCE((
    SELECT SUM(uls.total_points)
    FROM users u
    LEFT JOIN user_launch_status uls ON u.id = uls.user_id
    WHERE u.team_id = t.id
  ), 0),
  launch_points_updated_at = now()
WHERE t.id IN (
  SELECT DISTINCT team_id 
  FROM users 
  WHERE team_id IS NOT NULL
);
