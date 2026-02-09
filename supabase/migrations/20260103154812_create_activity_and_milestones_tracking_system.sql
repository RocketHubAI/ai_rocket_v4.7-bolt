/*
  # Activity and Milestones Point Tracking System

  1. New Tables
    - `user_activity_tracking` - Tracks daily activity for point calculation
    - `user_consecutive_days` - Tracks consecutive days streak
    
  2. New/Updated Functions
    - Activity tracking functions with point awarding
    - Milestone checking and awarding functions

  3. Triggers
    - Auto-award points on chat, report, and visualization creation

  4. Security
    - RLS enabled on all new tables
*/

-- Create user_activity_tracking table
CREATE TABLE IF NOT EXISTS user_activity_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_date date NOT NULL DEFAULT CURRENT_DATE,
  chat_count integer DEFAULT 0,
  team_chat_count integer DEFAULT 0,
  report_count integer DEFAULT 0,
  visualization_count integer DEFAULT 0,
  daily_points_awarded boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, activity_date)
);

-- Create consecutive_days_tracking table for streak tracking
CREATE TABLE IF NOT EXISTS user_consecutive_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  current_streak integer DEFAULT 0,
  longest_streak integer DEFAULT 0,
  last_active_date date,
  streak_start_date date,
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_activity_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_consecutive_days ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "Users can view own activity" ON user_activity_tracking;
DROP POLICY IF EXISTS "System can insert activity" ON user_activity_tracking;
DROP POLICY IF EXISTS "System can update activity" ON user_activity_tracking;

CREATE POLICY "Users can view own activity"
  ON user_activity_tracking FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert activity"
  ON user_activity_tracking FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update activity"
  ON user_activity_tracking FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for user_consecutive_days
DROP POLICY IF EXISTS "Users can view own streak" ON user_consecutive_days;
DROP POLICY IF EXISTS "System can insert streak" ON user_consecutive_days;
DROP POLICY IF EXISTS "System can update streak" ON user_consecutive_days;

CREATE POLICY "Users can view own streak"
  ON user_consecutive_days FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert streak"
  ON user_consecutive_days FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update streak"
  ON user_consecutive_days FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to get or create today's activity record
CREATE OR REPLACE FUNCTION get_or_create_activity_record(p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_record_id uuid;
BEGIN
  SELECT id INTO v_record_id
  FROM user_activity_tracking
  WHERE user_id = p_user_id AND activity_date = CURRENT_DATE;
  
  IF v_record_id IS NULL THEN
    INSERT INTO user_activity_tracking (user_id, activity_date)
    VALUES (p_user_id, CURRENT_DATE)
    RETURNING id INTO v_record_id;
  END IF;
  
  RETURN v_record_id;
END;
$$;

-- Function to track chat activity and award points
CREATE OR REPLACE FUNCTION track_chat_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_record_id uuid;
  v_is_team_chat boolean;
  v_activity_record RECORD;
  v_team_id uuid;
BEGIN
  -- Only track user messages (not AI responses)
  IF NEW.message_type = 'user' OR NEW.message_type IS NULL THEN
    v_is_team_chat := (NEW.mode = 'team');
    
    -- Get or create activity record
    v_record_id := get_or_create_activity_record(NEW.user_id);
    
    -- Update activity counts
    IF v_is_team_chat THEN
      UPDATE user_activity_tracking
      SET team_chat_count = team_chat_count + 1,
          updated_at = now()
      WHERE id = v_record_id;
      
      -- Award 5 points for team chat message
      SELECT team_id INTO v_team_id FROM public.users WHERE id = NEW.user_id;
      
      INSERT INTO launch_points_ledger (user_id, points, reason, reason_display, stage, metadata)
      VALUES (NEW.user_id, 5, 'activity_team_chat', 'Team Chat Message', 'activity', 
              jsonb_build_object('chat_id', NEW.id, 'date', CURRENT_DATE));
      
      IF v_team_id IS NOT NULL THEN
        UPDATE teams SET total_launch_points = total_launch_points + 5 WHERE id = v_team_id;
      END IF;
    ELSE
      UPDATE user_activity_tracking
      SET chat_count = chat_count + 1,
          updated_at = now()
      WHERE id = v_record_id;
    END IF;
    
    -- Check if we should award daily active points (first chat of the day)
    SELECT * INTO v_activity_record FROM user_activity_tracking WHERE id = v_record_id;
    
    IF NOT v_activity_record.daily_points_awarded AND v_activity_record.chat_count = 1 THEN
      SELECT team_id INTO v_team_id FROM public.users WHERE id = NEW.user_id;
      
      INSERT INTO launch_points_ledger (user_id, points, reason, reason_display, stage, metadata)
      VALUES (NEW.user_id, 10, 'activity_daily_chat', 'Daily AI Conversation', 'activity',
              jsonb_build_object('date', CURRENT_DATE));
      
      UPDATE user_activity_tracking
      SET daily_points_awarded = true
      WHERE id = v_record_id;
      
      IF v_team_id IS NOT NULL THEN
        UPDATE teams SET total_launch_points = total_launch_points + 10 WHERE id = v_team_id;
      END IF;
      
      -- Update consecutive days streak
      PERFORM update_consecutive_days_streak(NEW.user_id);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function to track report creation and award points
CREATE OR REPLACE FUNCTION track_report_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_record_id uuid;
  v_team_id uuid;
  v_user_id uuid;
BEGIN
  v_user_id := COALESCE(NEW.created_by_user_id, NEW.user_id);
  
  IF v_user_id IS NOT NULL THEN
    v_record_id := get_or_create_activity_record(v_user_id);
    
    UPDATE user_activity_tracking
    SET report_count = report_count + 1,
        updated_at = now()
    WHERE id = v_record_id;
    
    SELECT team_id INTO v_team_id FROM public.users WHERE id = v_user_id;
    
    INSERT INTO launch_points_ledger (user_id, points, reason, reason_display, stage, metadata)
    VALUES (v_user_id, 20, 'activity_report_created', 'Report Created', 'activity',
            jsonb_build_object('report_id', NEW.id, 'report_title', NEW.title, 'date', CURRENT_DATE));
    
    IF v_team_id IS NOT NULL THEN
      UPDATE teams SET total_launch_points = total_launch_points + 20 WHERE id = v_team_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function to track visualization creation and award points
CREATE OR REPLACE FUNCTION track_visualization_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_record_id uuid;
  v_team_id uuid;
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    v_record_id := get_or_create_activity_record(NEW.user_id);
    
    UPDATE user_activity_tracking
    SET visualization_count = visualization_count + 1,
        updated_at = now()
    WHERE id = v_record_id;
    
    SELECT team_id INTO v_team_id FROM public.users WHERE id = NEW.user_id;
    
    INSERT INTO launch_points_ledger (user_id, points, reason, reason_display, stage, metadata)
    VALUES (NEW.user_id, 15, 'activity_visualization_saved', 'Visualization Saved', 'activity',
            jsonb_build_object('viz_id', NEW.id, 'viz_title', NEW.title, 'date', CURRENT_DATE));
    
    IF v_team_id IS NOT NULL THEN
      UPDATE teams SET total_launch_points = total_launch_points + 15 WHERE id = v_team_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function to update consecutive days streak
CREATE OR REPLACE FUNCTION update_consecutive_days_streak(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_streak RECORD;
  v_team_id uuid;
BEGIN
  SELECT * INTO v_streak FROM user_consecutive_days WHERE user_id = p_user_id;
  
  IF v_streak IS NULL THEN
    INSERT INTO user_consecutive_days (user_id, current_streak, longest_streak, last_active_date, streak_start_date)
    VALUES (p_user_id, 1, 1, CURRENT_DATE, CURRENT_DATE);
  ELSE
    IF v_streak.last_active_date = CURRENT_DATE THEN
      RETURN;
    ELSIF v_streak.last_active_date = CURRENT_DATE - 1 THEN
      UPDATE user_consecutive_days
      SET current_streak = current_streak + 1,
          longest_streak = GREATEST(longest_streak, current_streak + 1),
          last_active_date = CURRENT_DATE,
          updated_at = now()
      WHERE user_id = p_user_id;
      
      -- Check for first week active milestone (7 days)
      IF v_streak.current_streak + 1 = 7 THEN
        SELECT team_id INTO v_team_id FROM public.users WHERE id = p_user_id;
        
        IF NOT EXISTS (SELECT 1 FROM user_milestones WHERE user_id = p_user_id AND milestone_key = 'first_week_active') THEN
          INSERT INTO user_milestones (user_id, milestone_key, points_awarded)
          VALUES (p_user_id, 'first_week_active', 100);
          
          INSERT INTO launch_points_ledger (user_id, points, reason, reason_display, stage, metadata)
          VALUES (p_user_id, 100, 'milestone_first_week_active', 'First Week Active', 'milestone',
                  jsonb_build_object('streak_days', 7));
          
          IF v_team_id IS NOT NULL THEN
            UPDATE teams SET total_launch_points = total_launch_points + 100 WHERE id = v_team_id;
          END IF;
        END IF;
      END IF;
    ELSE
      UPDATE user_consecutive_days
      SET current_streak = 1,
          last_active_date = CURRENT_DATE,
          streak_start_date = CURRENT_DATE,
          updated_at = now()
      WHERE user_id = p_user_id;
    END IF;
  END IF;
END;
$$;

-- Function to check and award milestones
CREATE OR REPLACE FUNCTION check_and_award_milestones(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_team_id uuid;
  v_team_member_count integer;
  v_document_count integer;
  v_chat_count integer;
BEGIN
  SELECT team_id INTO v_team_id FROM public.users WHERE id = p_user_id;
  
  IF v_team_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Check Team Growth milestone (5+ team members)
  SELECT COUNT(*) INTO v_team_member_count FROM public.users WHERE team_id = v_team_id;
  IF v_team_member_count >= 5 THEN
    IF NOT EXISTS (SELECT 1 FROM user_milestones WHERE user_id = p_user_id AND milestone_key = 'team_growth') THEN
      INSERT INTO user_milestones (user_id, milestone_key, points_awarded)
      VALUES (p_user_id, 'team_growth', 200);
      
      INSERT INTO launch_points_ledger (user_id, points, reason, reason_display, stage, metadata)
      VALUES (p_user_id, 200, 'milestone_team_growth', 'Team Growth', 'milestone',
              jsonb_build_object('team_size', v_team_member_count));
      
      UPDATE teams SET total_launch_points = total_launch_points + 200 WHERE id = v_team_id;
    END IF;
  END IF;
  
  -- Check Data Champion milestone (100+ documents)
  SELECT COUNT(DISTINCT COALESCE(google_file_id, source_id, id::text)) INTO v_document_count 
  FROM document_chunks WHERE team_id = v_team_id;
  
  IF v_document_count >= 100 THEN
    IF NOT EXISTS (SELECT 1 FROM user_milestones WHERE user_id = p_user_id AND milestone_key = 'data_champion') THEN
      INSERT INTO user_milestones (user_id, milestone_key, points_awarded)
      VALUES (p_user_id, 'data_champion', 150);
      
      INSERT INTO launch_points_ledger (user_id, points, reason, reason_display, stage, metadata)
      VALUES (p_user_id, 150, 'milestone_data_champion', 'Data Champion', 'milestone',
              jsonb_build_object('document_count', v_document_count));
      
      UPDATE teams SET total_launch_points = total_launch_points + 150 WHERE id = v_team_id;
    END IF;
  END IF;
  
  -- Check AI Power User milestone (500+ prompts)
  SELECT COUNT(*) INTO v_chat_count 
  FROM astra_chats 
  WHERE user_id = p_user_id AND (message_type = 'user' OR message_type IS NULL);
  
  IF v_chat_count >= 500 THEN
    IF NOT EXISTS (SELECT 1 FROM user_milestones WHERE user_id = p_user_id AND milestone_key = 'ai_power_user') THEN
      INSERT INTO user_milestones (user_id, milestone_key, points_awarded)
      VALUES (p_user_id, 'ai_power_user', 250);
      
      INSERT INTO launch_points_ledger (user_id, points, reason, reason_display, stage, metadata)
      VALUES (p_user_id, 250, 'milestone_ai_power_user', 'AI Power User', 'milestone',
              jsonb_build_object('chat_count', v_chat_count));
      
      UPDATE teams SET total_launch_points = total_launch_points + 250 WHERE id = v_team_id;
    END IF;
  END IF;
END;
$$;

-- Create triggers for activity tracking
DROP TRIGGER IF EXISTS track_chat_activity_trigger ON astra_chats;
CREATE TRIGGER track_chat_activity_trigger
  AFTER INSERT ON astra_chats
  FOR EACH ROW
  EXECUTE FUNCTION track_chat_activity();

DROP TRIGGER IF EXISTS track_report_activity_trigger ON astra_reports;
CREATE TRIGGER track_report_activity_trigger
  AFTER INSERT ON astra_reports
  FOR EACH ROW
  EXECUTE FUNCTION track_report_activity();

DROP TRIGGER IF EXISTS track_visualization_activity_trigger ON saved_visualizations;
CREATE TRIGGER track_visualization_activity_trigger
  AFTER INSERT ON saved_visualizations
  FOR EACH ROW
  EXECUTE FUNCTION track_visualization_activity();

-- Team growth milestone trigger
CREATE OR REPLACE FUNCTION check_team_growth_milestone()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_team_member_count integer;
  v_admin_id uuid;
BEGIN
  IF NEW.team_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_team_member_count FROM public.users WHERE team_id = NEW.team_id;
    
    IF v_team_member_count >= 5 THEN
      FOR v_admin_id IN 
        SELECT id FROM public.users 
        WHERE team_id = NEW.team_id AND role = 'admin'
        AND id NOT IN (SELECT user_id FROM user_milestones WHERE milestone_key = 'team_growth')
      LOOP
        INSERT INTO user_milestones (user_id, milestone_key, points_awarded)
        VALUES (v_admin_id, 'team_growth', 200);
        
        INSERT INTO launch_points_ledger (user_id, points, reason, reason_display, stage, metadata)
        VALUES (v_admin_id, 200, 'milestone_team_growth', 'Team Growth', 'milestone',
                jsonb_build_object('team_size', v_team_member_count));
        
        UPDATE teams SET total_launch_points = total_launch_points + 200 WHERE id = NEW.team_id;
      END LOOP;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_team_growth_trigger ON public.users;
CREATE TRIGGER check_team_growth_trigger
  AFTER INSERT OR UPDATE OF team_id ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION check_team_growth_milestone();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_activity_tracking_user_date ON user_activity_tracking(user_id, activity_date);
CREATE INDEX IF NOT EXISTS idx_launch_points_ledger_stage ON launch_points_ledger(stage);
