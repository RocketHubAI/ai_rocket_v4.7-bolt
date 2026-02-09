/*
  # Fix initialize_user_impact_progress for NULL team_id

  1. Problem
    - New team signups create a user in public.users with team_id = NULL
    - The on_user_created_init_impact trigger fires initialize_user_impact_progress()
    - This function inserts into user_impact_progress with NEW.team_id
    - user_impact_progress.team_id has a NOT NULL constraint
    - This causes "Database error saving new user" for all new team signups

  2. Fix
    - Add a NULL check for team_id before inserting impact progress rows
    - When team_id is NULL (new team signup), skip initialization
    - Impact progress will be initialized later when the user gets assigned a team

  3. Affected Users
    - Any user signing up as a new team (Preview Access invites with no team_id)
*/

CREATE OR REPLACE FUNCTION initialize_user_impact_progress()
RETURNS trigger AS $$
BEGIN
  IF NEW.team_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO user_impact_progress (user_id, team_id, feature_key, custom_priority)
  SELECT 
    NEW.id,
    NEW.team_id,
    i.feature_key,
    i.priority_rank
  FROM user_impact_items i
  WHERE i.is_active = true
  ON CONFLICT (user_id, feature_key) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
