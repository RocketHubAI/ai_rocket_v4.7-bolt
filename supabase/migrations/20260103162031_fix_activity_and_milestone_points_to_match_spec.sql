/*
  # Fix Activity and Milestone Points to Match Specification

  1. Activity Points (New System)
    - Daily Active: +5 pts when user sends a private chat, team chat, or runs a manual report
    - 5-Day Streak: +50 pts after 5 consecutive active days (repeatable, resets after each achievement)

  2. Milestone Points (New System)
    - Daily Power User: +25 pts for 10 messages in a day
    - Message Milestones: +100 pts (100 msgs), +150 pts (500 msgs), +200 pts (1000 msgs)
    - Visualization Milestones: +150 pts (5 saved), +200 pts (25 saved), +250 pts (100 saved)
    - Report Milestones: +200 pts (3 scheduled reports), +250 pts (10 scheduled reports)

  3. Changes
    - Drop old triggers and functions
    - Create new streamlined activity tracking
    - Add 5-day streak tracking with reset capability
    
  4. Security
    - Uses existing RLS policies
*/

-- Drop old triggers first
DROP TRIGGER IF EXISTS track_chat_activity_trigger ON astra_chats;
DROP TRIGGER IF EXISTS track_report_activity_trigger ON astra_reports;
DROP TRIGGER IF EXISTS track_visualization_activity_trigger ON saved_visualizations;
DROP TRIGGER IF EXISTS check_team_growth_trigger ON public.users;

-- Drop old functions
DROP FUNCTION IF EXISTS track_chat_activity();
DROP FUNCTION IF EXISTS track_report_activity();
DROP FUNCTION IF EXISTS track_visualization_activity();
DROP FUNCTION IF EXISTS check_team_growth_milestone();
DROP FUNCTION IF EXISTS check_and_award_milestones(uuid);
DROP FUNCTION IF EXISTS update_consecutive_days_streak(uuid);

-- Modify the user_activity_tracking table to track messages properly
ALTER TABLE user_activity_tracking ADD COLUMN IF NOT EXISTS message_count integer DEFAULT 0;
ALTER TABLE user_activity_tracking ADD COLUMN IF NOT EXISTS daily_power_user_awarded boolean DEFAULT false;

-- Modify consecutive days table for 5-day streak tracking
ALTER TABLE user_consecutive_days ADD COLUMN IF NOT EXISTS streak_rewards_claimed integer DEFAULT 0;

-- Function to mark user as active for the day and award daily points
CREATE OR REPLACE FUNCTION mark_user_active_today(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_record_id uuid;
  v_already_active boolean;
  v_team_id uuid;
  v_streak RECORD;
  v_new_streak integer;
  v_rewards_to_claim integer;
BEGIN
  -- Check if already marked active today
  SELECT id, daily_points_awarded INTO v_record_id, v_already_active
  FROM user_activity_tracking
  WHERE user_id = p_user_id AND activity_date = CURRENT_DATE;
  
  IF v_record_id IS NULL THEN
    -- Create new activity record for today
    INSERT INTO user_activity_tracking (user_id, activity_date, message_count, daily_points_awarded)
    VALUES (p_user_id, CURRENT_DATE, 0, false)
    RETURNING id INTO v_record_id;
    v_already_active := false;
  END IF;
  
  -- Award daily active points if not already awarded
  IF NOT v_already_active THEN
    SELECT team_id INTO v_team_id FROM public.users WHERE id = p_user_id;
    
    -- Award 5 points for daily activity
    INSERT INTO launch_points_ledger (user_id, points, reason, reason_display, stage, metadata)
    VALUES (p_user_id, 5, 'activity_daily_active', 'Daily Active', 'activity',
            jsonb_build_object('date', CURRENT_DATE));
    
    UPDATE user_activity_tracking SET daily_points_awarded = true WHERE id = v_record_id;
    
    IF v_team_id IS NOT NULL THEN
      UPDATE teams SET total_launch_points = total_launch_points + 5 WHERE id = v_team_id;
    END IF;
    
    -- Update consecutive days streak
    SELECT * INTO v_streak FROM user_consecutive_days WHERE user_id = p_user_id;
    
    IF v_streak IS NULL THEN
      INSERT INTO user_consecutive_days (user_id, current_streak, longest_streak, last_active_date, streak_start_date, streak_rewards_claimed)
      VALUES (p_user_id, 1, 1, CURRENT_DATE, CURRENT_DATE, 0);
      v_new_streak := 1;
    ELSIF v_streak.last_active_date = CURRENT_DATE THEN
      -- Already processed today
      RETURN;
    ELSIF v_streak.last_active_date = CURRENT_DATE - 1 THEN
      -- Continuing streak
      v_new_streak := v_streak.current_streak + 1;
      UPDATE user_consecutive_days
      SET current_streak = v_new_streak,
          longest_streak = GREATEST(longest_streak, v_new_streak),
          last_active_date = CURRENT_DATE,
          updated_at = now()
      WHERE user_id = p_user_id;
    ELSE
      -- Streak broken, start fresh
      v_new_streak := 1;
      UPDATE user_consecutive_days
      SET current_streak = 1,
          last_active_date = CURRENT_DATE,
          streak_start_date = CURRENT_DATE,
          streak_rewards_claimed = 0,
          updated_at = now()
      WHERE user_id = p_user_id;
    END IF;
    
    -- Check for 5-day streak rewards (can be earned multiple times)
    SELECT streak_rewards_claimed INTO v_rewards_to_claim FROM user_consecutive_days WHERE user_id = p_user_id;
    
    IF v_new_streak >= 5 AND (v_new_streak / 5) > COALESCE(v_rewards_to_claim, 0) THEN
      -- Award 50 points for 5-day streak
      INSERT INTO launch_points_ledger (user_id, points, reason, reason_display, stage, metadata)
      VALUES (p_user_id, 50, 'activity_5_day_streak', '5-Day Streak', 'activity',
              jsonb_build_object('streak_days', v_new_streak, 'streak_number', (v_new_streak / 5)));
      
      UPDATE user_consecutive_days
      SET streak_rewards_claimed = v_new_streak / 5
      WHERE user_id = p_user_id;
      
      IF v_team_id IS NOT NULL THEN
        UPDATE teams SET total_launch_points = total_launch_points + 50 WHERE id = v_team_id;
      END IF;
    END IF;
  END IF;
END;
$$;

-- Function to track message activity (private chat, team chat, or manual report)
CREATE OR REPLACE FUNCTION track_message_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_team_id uuid;
  v_today_messages integer;
  v_total_messages bigint;
  v_record_id uuid;
BEGIN
  -- Only track user messages
  IF NEW.message_type = 'user' OR NEW.message_type IS NULL THEN
    -- Mark user as active today (awards daily points and streak)
    PERFORM mark_user_active_today(NEW.user_id);
    
    -- Increment message count for today
    UPDATE user_activity_tracking
    SET message_count = message_count + 1,
        updated_at = now()
    WHERE user_id = NEW.user_id AND activity_date = CURRENT_DATE
    RETURNING id, message_count INTO v_record_id, v_today_messages;
    
    SELECT team_id INTO v_team_id FROM public.users WHERE id = NEW.user_id;
    
    -- Check for Daily Power User milestone (10 messages in a day)
    IF v_today_messages = 10 THEN
      -- Check if not already awarded today
      IF NOT EXISTS (
        SELECT 1 FROM user_activity_tracking 
        WHERE id = v_record_id AND daily_power_user_awarded = true
      ) THEN
        INSERT INTO launch_points_ledger (user_id, points, reason, reason_display, stage, metadata)
        VALUES (NEW.user_id, 25, 'milestone_daily_power_user', 'Daily Power User', 'milestone',
                jsonb_build_object('date', CURRENT_DATE, 'messages', v_today_messages));
        
        UPDATE user_activity_tracking SET daily_power_user_awarded = true WHERE id = v_record_id;
        
        IF v_team_id IS NOT NULL THEN
          UPDATE teams SET total_launch_points = total_launch_points + 25 WHERE id = v_team_id;
        END IF;
      END IF;
    END IF;
    
    -- Check total message milestones
    SELECT COUNT(*) INTO v_total_messages 
    FROM astra_chats 
    WHERE user_id = NEW.user_id AND (message_type = 'user' OR message_type IS NULL);
    
    -- 100 total messages milestone
    IF v_total_messages = 100 THEN
      IF NOT EXISTS (SELECT 1 FROM user_milestones WHERE user_id = NEW.user_id AND milestone_type = 'messages_100') THEN
        INSERT INTO user_milestones (user_id, milestone_type, milestone_value, achieved_at)
        VALUES (NEW.user_id, 'messages_100', jsonb_build_object('points', 100, 'count', v_total_messages), now());
        
        INSERT INTO launch_points_ledger (user_id, points, reason, reason_display, stage, metadata)
        VALUES (NEW.user_id, 100, 'milestone_messages_100', '100 Messages', 'milestone',
                jsonb_build_object('total_messages', v_total_messages));
        
        IF v_team_id IS NOT NULL THEN
          UPDATE teams SET total_launch_points = total_launch_points + 100 WHERE id = v_team_id;
        END IF;
      END IF;
    END IF;
    
    -- 500 total messages milestone
    IF v_total_messages = 500 THEN
      IF NOT EXISTS (SELECT 1 FROM user_milestones WHERE user_id = NEW.user_id AND milestone_type = 'messages_500') THEN
        INSERT INTO user_milestones (user_id, milestone_type, milestone_value, achieved_at)
        VALUES (NEW.user_id, 'messages_500', jsonb_build_object('points', 150, 'count', v_total_messages), now());
        
        INSERT INTO launch_points_ledger (user_id, points, reason, reason_display, stage, metadata)
        VALUES (NEW.user_id, 150, 'milestone_messages_500', '500 Messages', 'milestone',
                jsonb_build_object('total_messages', v_total_messages));
        
        IF v_team_id IS NOT NULL THEN
          UPDATE teams SET total_launch_points = total_launch_points + 150 WHERE id = v_team_id;
        END IF;
      END IF;
    END IF;
    
    -- 1000 total messages milestone
    IF v_total_messages = 1000 THEN
      IF NOT EXISTS (SELECT 1 FROM user_milestones WHERE user_id = NEW.user_id AND milestone_type = 'messages_1000') THEN
        INSERT INTO user_milestones (user_id, milestone_type, milestone_value, achieved_at)
        VALUES (NEW.user_id, 'messages_1000', jsonb_build_object('points', 200, 'count', v_total_messages), now());
        
        INSERT INTO launch_points_ledger (user_id, points, reason, reason_display, stage, metadata)
        VALUES (NEW.user_id, 200, 'milestone_messages_1000', '1000 Messages', 'milestone',
                jsonb_build_object('total_messages', v_total_messages));
        
        IF v_team_id IS NOT NULL THEN
          UPDATE teams SET total_launch_points = total_launch_points + 200 WHERE id = v_team_id;
        END IF;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function to track manual report activity
CREATE OR REPLACE FUNCTION track_manual_report_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := COALESCE(NEW.created_by_user_id, NEW.user_id);
  
  IF v_user_id IS NOT NULL THEN
    -- Mark user as active today (awards daily points and streak)
    PERFORM mark_user_active_today(v_user_id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function to track visualization milestones
CREATE OR REPLACE FUNCTION track_visualization_milestone()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_team_id uuid;
  v_total_viz bigint;
BEGIN
  IF NEW.user_id IS NOT NULL THEN
    SELECT team_id INTO v_team_id FROM public.users WHERE id = NEW.user_id;
    
    -- Count total saved visualizations
    SELECT COUNT(*) INTO v_total_viz FROM saved_visualizations WHERE user_id = NEW.user_id;
    
    -- 5 visualizations milestone
    IF v_total_viz = 5 THEN
      IF NOT EXISTS (SELECT 1 FROM user_milestones WHERE user_id = NEW.user_id AND milestone_type = 'visualizations_5') THEN
        INSERT INTO user_milestones (user_id, milestone_type, milestone_value, achieved_at)
        VALUES (NEW.user_id, 'visualizations_5', jsonb_build_object('points', 150, 'count', v_total_viz), now());
        
        INSERT INTO launch_points_ledger (user_id, points, reason, reason_display, stage, metadata)
        VALUES (NEW.user_id, 150, 'milestone_visualizations_5', '5 Visualizations Saved', 'milestone',
                jsonb_build_object('total_visualizations', v_total_viz));
        
        IF v_team_id IS NOT NULL THEN
          UPDATE teams SET total_launch_points = total_launch_points + 150 WHERE id = v_team_id;
        END IF;
      END IF;
    END IF;
    
    -- 25 visualizations milestone
    IF v_total_viz = 25 THEN
      IF NOT EXISTS (SELECT 1 FROM user_milestones WHERE user_id = NEW.user_id AND milestone_type = 'visualizations_25') THEN
        INSERT INTO user_milestones (user_id, milestone_type, milestone_value, achieved_at)
        VALUES (NEW.user_id, 'visualizations_25', jsonb_build_object('points', 200, 'count', v_total_viz), now());
        
        INSERT INTO launch_points_ledger (user_id, points, reason, reason_display, stage, metadata)
        VALUES (NEW.user_id, 200, 'milestone_visualizations_25', '25 Visualizations Saved', 'milestone',
                jsonb_build_object('total_visualizations', v_total_viz));
        
        IF v_team_id IS NOT NULL THEN
          UPDATE teams SET total_launch_points = total_launch_points + 200 WHERE id = v_team_id;
        END IF;
      END IF;
    END IF;
    
    -- 100 visualizations milestone
    IF v_total_viz = 100 THEN
      IF NOT EXISTS (SELECT 1 FROM user_milestones WHERE user_id = NEW.user_id AND milestone_type = 'visualizations_100') THEN
        INSERT INTO user_milestones (user_id, milestone_type, milestone_value, achieved_at)
        VALUES (NEW.user_id, 'visualizations_100', jsonb_build_object('points', 250, 'count', v_total_viz), now());
        
        INSERT INTO launch_points_ledger (user_id, points, reason, reason_display, stage, metadata)
        VALUES (NEW.user_id, 250, 'milestone_visualizations_100', '100 Visualizations Saved', 'milestone',
                jsonb_build_object('total_visualizations', v_total_viz));
        
        IF v_team_id IS NOT NULL THEN
          UPDATE teams SET total_launch_points = total_launch_points + 250 WHERE id = v_team_id;
        END IF;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function to track scheduled report milestones (uses is_active column)
CREATE OR REPLACE FUNCTION track_scheduled_report_milestone()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_team_id uuid;
  v_total_scheduled bigint;
  v_user_id uuid;
BEGIN
  v_user_id := COALESCE(NEW.created_by_user_id, NEW.user_id);
  
  IF v_user_id IS NOT NULL AND NEW.is_active = true AND NEW.schedule_type IS NOT NULL THEN
    SELECT team_id INTO v_team_id FROM public.users WHERE id = v_user_id;
    
    -- Count total scheduled reports for this user/team
    SELECT COUNT(*) INTO v_total_scheduled 
    FROM astra_reports 
    WHERE (created_by_user_id = v_user_id OR user_id = v_user_id) 
    AND is_active = true
    AND schedule_type IS NOT NULL;
    
    -- 3 scheduled reports milestone
    IF v_total_scheduled = 3 THEN
      IF NOT EXISTS (SELECT 1 FROM user_milestones WHERE user_id = v_user_id AND milestone_type = 'scheduled_reports_3') THEN
        INSERT INTO user_milestones (user_id, milestone_type, milestone_value, achieved_at)
        VALUES (v_user_id, 'scheduled_reports_3', jsonb_build_object('points', 200, 'count', v_total_scheduled), now());
        
        INSERT INTO launch_points_ledger (user_id, points, reason, reason_display, stage, metadata)
        VALUES (v_user_id, 200, 'milestone_scheduled_reports_3', '3 Scheduled Reports', 'milestone',
                jsonb_build_object('total_scheduled', v_total_scheduled));
        
        IF v_team_id IS NOT NULL THEN
          UPDATE teams SET total_launch_points = total_launch_points + 200 WHERE id = v_team_id;
        END IF;
      END IF;
    END IF;
    
    -- 10 scheduled reports milestone
    IF v_total_scheduled = 10 THEN
      IF NOT EXISTS (SELECT 1 FROM user_milestones WHERE user_id = v_user_id AND milestone_type = 'scheduled_reports_10') THEN
        INSERT INTO user_milestones (user_id, milestone_type, milestone_value, achieved_at)
        VALUES (v_user_id, 'scheduled_reports_10', jsonb_build_object('points', 250, 'count', v_total_scheduled), now());
        
        INSERT INTO launch_points_ledger (user_id, points, reason, reason_display, stage, metadata)
        VALUES (v_user_id, 250, 'milestone_scheduled_reports_10', '10 Scheduled Reports', 'milestone',
                jsonb_build_object('total_scheduled', v_total_scheduled));
        
        IF v_team_id IS NOT NULL THEN
          UPDATE teams SET total_launch_points = total_launch_points + 250 WHERE id = v_team_id;
        END IF;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create new triggers
CREATE TRIGGER track_message_activity_trigger
  AFTER INSERT ON astra_chats
  FOR EACH ROW
  EXECUTE FUNCTION track_message_activity();

CREATE TRIGGER track_manual_report_activity_trigger
  AFTER INSERT ON astra_reports
  FOR EACH ROW
  EXECUTE FUNCTION track_manual_report_activity();

CREATE TRIGGER track_visualization_milestone_trigger
  AFTER INSERT ON saved_visualizations
  FOR EACH ROW
  EXECUTE FUNCTION track_visualization_milestone();

CREATE TRIGGER track_scheduled_report_milestone_trigger
  AFTER INSERT OR UPDATE OF is_active ON astra_reports
  FOR EACH ROW
  EXECUTE FUNCTION track_scheduled_report_milestone();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_activity_message_count ON user_activity_tracking(user_id, activity_date, message_count);
CREATE INDEX IF NOT EXISTS idx_user_milestones_type ON user_milestones(user_id, milestone_type);
