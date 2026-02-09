/*
  # Fix return type for get_team_admin_guidance_progress

  1. Changes
    - Change admin_achievements return type from text[] to jsonb
    - Matches the actual column type in launch_preparation_progress table
*/

DROP FUNCTION IF EXISTS get_team_admin_guidance_progress();

CREATE OR REPLACE FUNCTION get_team_admin_guidance_progress()
RETURNS TABLE (
  admin_level integer,
  admin_achievements jsonb
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
