/*
  # Add Astra Create to Feature Usage Tracking

  1. Changes
    - Add `astra_create_count`, `astra_create_first_used`, `astra_create_last_used` columns
    - Update `track_feature_usage` function to handle 'astra_create' feature

  2. Notes
    - This allows tracking Astra Create visualization usage separately from other visualizations
*/

-- Add columns for astra_create tracking
ALTER TABLE user_feature_usage
ADD COLUMN IF NOT EXISTS astra_create_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS astra_create_first_used timestamptz,
ADD COLUMN IF NOT EXISTS astra_create_last_used timestamptz;

-- Update the track_feature_usage function to include astra_create
CREATE OR REPLACE FUNCTION track_feature_usage(
  p_user_id uuid,
  p_feature text,
  p_increment integer DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
BEGIN
  INSERT INTO user_feature_usage (user_id, created_at, updated_at)
  VALUES (p_user_id, v_now, v_now)
  ON CONFLICT (user_id) DO NOTHING;

  CASE p_feature
    WHEN 'ask_astra' THEN
      UPDATE user_feature_usage
      SET 
        ask_astra_count = ask_astra_count + p_increment,
        ask_astra_first_used = COALESCE(ask_astra_first_used, v_now),
        ask_astra_last_used = v_now,
        updated_at = v_now
      WHERE user_id = p_user_id;
      
    WHEN 'visualizations' THEN
      UPDATE user_feature_usage
      SET 
        visualizations_count = visualizations_count + p_increment,
        visualizations_first_used = COALESCE(visualizations_first_used, v_now),
        visualizations_last_used = v_now,
        updated_at = v_now
      WHERE user_id = p_user_id;

    WHEN 'astra_create' THEN
      UPDATE user_feature_usage
      SET 
        astra_create_count = astra_create_count + p_increment,
        astra_create_first_used = COALESCE(astra_create_first_used, v_now),
        astra_create_last_used = v_now,
        updated_at = v_now
      WHERE user_id = p_user_id;
      
    WHEN 'scheduled_reports' THEN
      UPDATE user_feature_usage
      SET 
        scheduled_reports_count = scheduled_reports_count + p_increment,
        scheduled_reports_first_used = COALESCE(scheduled_reports_first_used, v_now),
        scheduled_reports_last_used = v_now,
        updated_at = v_now
      WHERE user_id = p_user_id;
      
    WHEN 'team_chat' THEN
      UPDATE user_feature_usage
      SET 
        team_chat_count = team_chat_count + p_increment,
        team_chat_first_used = COALESCE(team_chat_first_used, v_now),
        team_chat_last_used = v_now,
        updated_at = v_now
      WHERE user_id = p_user_id;
      
    WHEN 'drive_sync' THEN
      UPDATE user_feature_usage
      SET 
        drive_sync_count = drive_sync_count + p_increment,
        drive_sync_first_used = COALESCE(drive_sync_first_used, v_now),
        drive_sync_last_used = v_now,
        updated_at = v_now
      WHERE user_id = p_user_id;
      
    WHEN 'local_uploads' THEN
      UPDATE user_feature_usage
      SET 
        local_uploads_count = local_uploads_count + p_increment,
        local_uploads_first_used = COALESCE(local_uploads_first_used, v_now),
        local_uploads_last_used = v_now,
        updated_at = v_now
      WHERE user_id = p_user_id;
      
    WHEN 'saved_prompts' THEN
      UPDATE user_feature_usage
      SET 
        saved_prompts_count = saved_prompts_count + p_increment,
        saved_prompts_first_used = COALESCE(saved_prompts_first_used, v_now),
        saved_prompts_last_used = v_now,
        updated_at = v_now
      WHERE user_id = p_user_id;

    WHEN 'team_dashboard' THEN
      UPDATE user_feature_usage
      SET 
        team_dashboard_count = COALESCE(team_dashboard_count, 0) + p_increment,
        team_dashboard_first_used = COALESCE(team_dashboard_first_used, v_now),
        team_dashboard_last_used = v_now,
        updated_at = v_now
      WHERE user_id = p_user_id;

    WHEN 'team_pulse' THEN
      UPDATE user_feature_usage
      SET 
        team_pulse_count = COALESCE(team_pulse_count, 0) + p_increment,
        team_pulse_first_used = COALESCE(team_pulse_first_used, v_now),
        team_pulse_last_used = v_now,
        updated_at = v_now
      WHERE user_id = p_user_id;
      
    ELSE
      RAISE EXCEPTION 'Unknown feature: %', p_feature;
  END CASE;
END;
$$;

GRANT EXECUTE ON FUNCTION track_feature_usage TO authenticated;
