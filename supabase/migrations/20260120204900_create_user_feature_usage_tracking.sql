/*
  # Create User Feature Usage Tracking System

  1. New Tables
    - `user_feature_usage`
      - `user_id` (uuid, primary key, references auth.users)
      - `ask_astra_count` (integer) - Number of Astra chat messages sent
      - `ask_astra_first_used` (timestamptz) - First time using Ask Astra
      - `ask_astra_last_used` (timestamptz) - Last time using Ask Astra
      - `visualizations_count` (integer) - Number of visualizations created
      - `visualizations_first_used` (timestamptz)
      - `visualizations_last_used` (timestamptz)
      - `scheduled_reports_count` (integer) - Number of scheduled reports created
      - `scheduled_reports_first_used` (timestamptz)
      - `scheduled_reports_last_used` (timestamptz)
      - `team_chat_count` (integer) - Number of team chat messages sent
      - `team_chat_first_used` (timestamptz)
      - `team_chat_last_used` (timestamptz)
      - `drive_sync_count` (integer) - Number of drive folders synced
      - `drive_sync_first_used` (timestamptz)
      - `drive_sync_last_used` (timestamptz)
      - `local_uploads_count` (integer) - Number of local files uploaded
      - `local_uploads_first_used` (timestamptz)
      - `local_uploads_last_used` (timestamptz)
      - `saved_prompts_count` (integer) - Number of saved prompts
      - `saved_prompts_first_used` (timestamptz)
      - `saved_prompts_last_used` (timestamptz)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Functions
    - `track_feature_usage` - RPC function to increment usage and set timestamps

  3. Security
    - Enable RLS on `user_feature_usage` table
    - Users can only read/update their own usage data
*/

-- Create user_feature_usage table
CREATE TABLE IF NOT EXISTS user_feature_usage (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  ask_astra_count integer DEFAULT 0,
  ask_astra_first_used timestamptz,
  ask_astra_last_used timestamptz,
  
  visualizations_count integer DEFAULT 0,
  visualizations_first_used timestamptz,
  visualizations_last_used timestamptz,
  
  scheduled_reports_count integer DEFAULT 0,
  scheduled_reports_first_used timestamptz,
  scheduled_reports_last_used timestamptz,
  
  team_chat_count integer DEFAULT 0,
  team_chat_first_used timestamptz,
  team_chat_last_used timestamptz,
  
  drive_sync_count integer DEFAULT 0,
  drive_sync_first_used timestamptz,
  drive_sync_last_used timestamptz,
  
  local_uploads_count integer DEFAULT 0,
  local_uploads_first_used timestamptz,
  local_uploads_last_used timestamptz,
  
  saved_prompts_count integer DEFAULT 0,
  saved_prompts_first_used timestamptz,
  saved_prompts_last_used timestamptz,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_feature_usage ENABLE ROW LEVEL SECURITY;

-- Users can view their own usage
CREATE POLICY "Users can view own feature usage"
  ON user_feature_usage
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own usage record
CREATE POLICY "Users can insert own feature usage"
  ON user_feature_usage
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own usage
CREATE POLICY "Users can update own feature usage"
  ON user_feature_usage
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Super admins can view all feature usage
CREATE POLICY "Super admins can view all feature usage"
  ON user_feature_usage
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.email IN ('clay@rockethub.ai', 'derek@rockethub.ai', 'marshall@rockethub.ai')
    )
  );

-- Create function to track feature usage
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
  -- Insert or update the usage record
  INSERT INTO user_feature_usage (user_id, created_at, updated_at)
  VALUES (p_user_id, v_now, v_now)
  ON CONFLICT (user_id) DO NOTHING;

  -- Update the specific feature counters
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
      
    ELSE
      RAISE EXCEPTION 'Unknown feature: %', p_feature;
  END CASE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION track_feature_usage TO authenticated;