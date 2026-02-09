/*
  # Add Team Dashboard and Team Pulse Feature Tracking

  1. Changes
    - Add team_dashboard tracking columns to user_feature_usage
    - Add team_pulse tracking columns to user_feature_usage
    - Update track_feature_usage function to handle new features

  2. New Columns
    - `team_dashboard_count` (integer) - Number of times Team Dashboard was viewed
    - `team_dashboard_first_used` (timestamptz)
    - `team_dashboard_last_used` (timestamptz)
    - `team_pulse_count` (integer) - Number of times Team Pulse was viewed
    - `team_pulse_first_used` (timestamptz)
    - `team_pulse_last_used` (timestamptz)
*/

-- Add team_dashboard columns
ALTER TABLE user_feature_usage 
ADD COLUMN IF NOT EXISTS team_dashboard_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS team_dashboard_first_used timestamptz,
ADD COLUMN IF NOT EXISTS team_dashboard_last_used timestamptz;

-- Add team_pulse columns
ALTER TABLE user_feature_usage 
ADD COLUMN IF NOT EXISTS team_pulse_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS team_pulse_first_used timestamptz,
ADD COLUMN IF NOT EXISTS team_pulse_last_used timestamptz;

-- Update the track_feature_usage function to handle new features
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
        team_dashboard_count = team_dashboard_count + p_increment,
        team_dashboard_first_used = COALESCE(team_dashboard_first_used, v_now),
        team_dashboard_last_used = v_now,
        updated_at = v_now
      WHERE user_id = p_user_id;

    WHEN 'team_pulse' THEN
      UPDATE user_feature_usage
      SET 
        team_pulse_count = team_pulse_count + p_increment,
        team_pulse_first_used = COALESCE(team_pulse_first_used, v_now),
        team_pulse_last_used = v_now,
        updated_at = v_now
      WHERE user_id = p_user_id;
      
    ELSE
      RAISE EXCEPTION 'Unknown feature: %', p_feature;
  END CASE;
END;
$$;