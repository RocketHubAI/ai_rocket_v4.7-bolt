/*
  # Auto-Sync Fuel Level on Document Changes

  1. Problem
    - Fuel levels in launch_preparation_progress only update when users visit the FuelStage UI
    - Users with many synced documents show incorrect (lower) fuel levels in Admin Dashboard
    - Document syncs happen in background but level progress isn't tracked

  2. Solution
    - Create a function that syncs fuel level for all users on a team
    - Create a trigger on document_chunks that fires after INSERT
    - Automatically updates launch_preparation_progress when documents are added

  3. New Functions
    - `sync_team_fuel_levels(team_id)`: Updates fuel level for all team members based on document count
    - Calculates level using same thresholds as calculate_fuel_level()
    - Updates achievements array and points_earned accordingly

  4. New Trigger
    - `trigger_sync_fuel_levels_on_document_insert`: Fires after INSERT on document_chunks
    - Calls sync function for the affected team
*/

-- Function to sync fuel levels for all users on a team
CREATE OR REPLACE FUNCTION sync_team_fuel_levels(p_team_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doc_count integer;
  v_cat_count integer;
  v_calculated_level integer := 0;
  v_user_record record;
  v_current_level integer;
  v_new_achievements jsonb;
  v_points_to_add integer;
BEGIN
  -- Count documents and categories for this team
  SELECT 
    COUNT(DISTINCT COALESCE(source_id, google_file_id)),
    COUNT(DISTINCT doc_category)
  INTO v_doc_count, v_cat_count
  FROM document_chunks
  WHERE team_id = p_team_id
    AND (source_id IS NOT NULL OR google_file_id IS NOT NULL)
    AND doc_category IS NOT NULL;

  -- Calculate the level based on thresholds
  IF v_doc_count >= 1000 AND v_cat_count >= 12 THEN
    v_calculated_level := 5;
  ELSIF v_doc_count >= 200 AND v_cat_count >= 8 THEN
    v_calculated_level := 4;
  ELSIF v_doc_count >= 50 AND v_cat_count >= 5 THEN
    v_calculated_level := 3;
  ELSIF v_doc_count >= 5 AND v_cat_count >= 2 THEN
    v_calculated_level := 2;
  ELSIF v_doc_count >= 1 THEN
    v_calculated_level := 1;
  END IF;

  -- Update all users on this team
  FOR v_user_record IN 
    SELECT u.id as user_id
    FROM users u
    WHERE u.team_id = p_team_id
  LOOP
    -- Get current level for this user
    SELECT COALESCE(level, 0) INTO v_current_level
    FROM launch_preparation_progress
    WHERE user_id = v_user_record.user_id AND stage = 'fuel';

    -- Only update if calculated level is higher
    IF v_calculated_level > COALESCE(v_current_level, 0) THEN
      -- Build achievements array for all levels up to calculated
      v_new_achievements := '[]'::jsonb;
      v_points_to_add := 0;

      IF v_calculated_level >= 1 THEN
        v_new_achievements := v_new_achievements || '["fuel_first_document"]'::jsonb;
        v_points_to_add := v_points_to_add + 50;
      END IF;
      IF v_calculated_level >= 2 THEN
        v_new_achievements := v_new_achievements || '["fuel_level_2"]'::jsonb;
        v_points_to_add := v_points_to_add + 100;
      END IF;
      IF v_calculated_level >= 3 THEN
        v_new_achievements := v_new_achievements || '["fuel_level_3"]'::jsonb;
        v_points_to_add := v_points_to_add + 200;
      END IF;
      IF v_calculated_level >= 4 THEN
        v_new_achievements := v_new_achievements || '["fuel_level_4"]'::jsonb;
        v_points_to_add := v_points_to_add + 300;
      END IF;
      IF v_calculated_level >= 5 THEN
        v_new_achievements := v_new_achievements || '["fuel_level_5"]'::jsonb;
        v_points_to_add := v_points_to_add + 500;
      END IF;

      -- Upsert the progress record
      INSERT INTO launch_preparation_progress (
        user_id, 
        stage, 
        level, 
        achievements, 
        points_earned, 
        stage_started_at,
        level_completed_at,
        created_at, 
        updated_at
      )
      VALUES (
        v_user_record.user_id,
        'fuel',
        v_calculated_level,
        v_new_achievements,
        v_points_to_add,
        now(),
        now(),
        now(),
        now()
      )
      ON CONFLICT (user_id, stage) 
      DO UPDATE SET 
        level = v_calculated_level,
        achievements = v_new_achievements,
        points_earned = v_points_to_add,
        level_completed_at = now(),
        updated_at = now()
      WHERE launch_preparation_progress.level < v_calculated_level;
    END IF;
  END LOOP;
END;
$$;

-- Trigger function to call sync on document insert
CREATE OR REPLACE FUNCTION trigger_sync_fuel_levels()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only sync if team_id is present
  IF NEW.team_id IS NOT NULL THEN
    PERFORM sync_team_fuel_levels(NEW.team_id);
  END IF;
  RETURN NEW;
END;
$$;

-- Create the trigger (drop first if exists)
DROP TRIGGER IF EXISTS trigger_sync_fuel_levels_on_document_insert ON document_chunks;

CREATE TRIGGER trigger_sync_fuel_levels_on_document_insert
  AFTER INSERT ON document_chunks
  FOR EACH ROW
  EXECUTE FUNCTION trigger_sync_fuel_levels();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION sync_team_fuel_levels(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION sync_team_fuel_levels(uuid) TO service_role;
