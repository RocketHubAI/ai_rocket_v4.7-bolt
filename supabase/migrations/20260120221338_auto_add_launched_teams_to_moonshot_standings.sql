/*
  # Auto-add Launched Teams to Moonshot Challenge Standings

  1. Changes
    - Creates a trigger function that adds teams to moonshot_challenge_standings when a user launches
    - Adds trigger on user_launch_status table when is_launched changes to true
    - Backfills any launched teams that are missing from standings

  2. Purpose
    - Ensures all launched teams appear in the Moonshot Challenge view
    - Teams no longer need to register through the Moonshot form to participate
*/

CREATE OR REPLACE FUNCTION add_launched_team_to_moonshot_standings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_id uuid;
  v_team_name text;
  v_industry text;
BEGIN
  IF NEW.is_launched = true AND (OLD.is_launched IS NULL OR OLD.is_launched = false) THEN
    SELECT u.team_id, t.name INTO v_team_id, v_team_name
    FROM users u
    JOIN teams t ON t.id = u.team_id
    WHERE u.id = NEW.user_id;
    
    IF v_team_id IS NULL THEN
      RETURN NEW;
    END IF;
    
    SELECT mr.industry INTO v_industry 
    FROM moonshot_registrations mr 
    WHERE mr.team_id = v_team_id 
    LIMIT 1;

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
      v_team_id,
      COALESCE(v_team_name, 'Unknown Team'),
      v_industry,
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
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_add_launched_team_to_moonshot ON user_launch_status;
CREATE TRIGGER trigger_add_launched_team_to_moonshot
  AFTER UPDATE OF is_launched ON user_launch_status
  FOR EACH ROW
  EXECUTE FUNCTION add_launched_team_to_moonshot_standings();

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
)
SELECT DISTINCT ON (u.team_id)
  u.team_id,
  t.name,
  mr.industry,
  'Needs Improvement',
  'Needs Improvement',
  'Needs Improvement',
  'Needs Improvement',
  'Needs Improvement',
  false,
  0,
  NOW(),
  NOW()
FROM user_launch_status uls
JOIN users u ON u.id = uls.user_id
JOIN teams t ON t.id = u.team_id
LEFT JOIN moonshot_registrations mr ON mr.team_id = u.team_id
WHERE uls.is_launched = true
  AND u.team_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM moonshot_challenge_standings mcs WHERE mcs.team_id = u.team_id
  );