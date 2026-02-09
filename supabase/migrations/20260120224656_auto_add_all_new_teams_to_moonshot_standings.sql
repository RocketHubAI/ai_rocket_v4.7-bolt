/*
  # Auto-add All New Teams to Moonshot Challenge Standings

  1. Changes
    - Creates a trigger that adds teams to moonshot_challenge_standings when created
    - All teams participate in the challenge automatically

  2. Purpose
    - Every team is part of the Moonshot Challenge by default
    - No separate registration required
*/

CREATE OR REPLACE FUNCTION add_new_team_to_moonshot_standings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO moonshot_challenge_standings (
    team_id,
    team_name,
    industry,
    run_indicator,
    build_indicator,
    grow_indicator,
    launch_points_indicator,
    overall_indicator,
    is_top_25_percent,
    scores_calculated_count,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.name,
    NULL,
    'Needs Improvement',
    'Needs Improvement',
    'Needs Improvement',
    'Needs Improvement',
    'Needs Improvement',
    false,
    0,
    NOW(),
    NOW()
  )
  ON CONFLICT (team_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_add_new_team_to_moonshot ON teams;
CREATE TRIGGER trigger_add_new_team_to_moonshot
  AFTER INSERT ON teams
  FOR EACH ROW
  EXECUTE FUNCTION add_new_team_to_moonshot_standings();