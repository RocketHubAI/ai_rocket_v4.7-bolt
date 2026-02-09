/*
  # Create function to get team admin's guidance progress

  1. Purpose
    - Allow team members to retrieve their admin's guidance progress
    - Used for syncing member guidance levels when admin has completed tasks
    - Uses SECURITY DEFINER to bypass RLS while maintaining team-level security

  2. Security
    - Only returns data for the caller's own team
    - Validates team membership before returning data
    - Returns null if no admin found or user not on a team
*/

CREATE OR REPLACE FUNCTION get_team_admin_guidance_progress()
RETURNS TABLE (
  admin_level integer,
  admin_achievements text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_id uuid;
  v_admin_id uuid;
BEGIN
  -- Get the caller's team_id from the users table
  SELECT team_id INTO v_team_id
  FROM users
  WHERE id = auth.uid();

  -- If user has no team, return empty
  IF v_team_id IS NULL THEN
    RETURN;
  END IF;

  -- Find the team admin
  SELECT id INTO v_admin_id
  FROM users
  WHERE team_id = v_team_id
    AND role = 'admin'
  LIMIT 1;

  -- If no admin found, return empty
  IF v_admin_id IS NULL THEN
    RETURN;
  END IF;

  -- Return the admin's guidance progress
  RETURN QUERY
  SELECT 
    lpp.level,
    lpp.achievements
  FROM launch_preparation_progress lpp
  WHERE lpp.user_id = v_admin_id
    AND lpp.stage = 'guidance';
END;
$$;

GRANT EXECUTE ON FUNCTION get_team_admin_guidance_progress() TO authenticated;
