/*
  # Remove Activity Points, Task Achievements, First Week Active; Add Team Chat Milestones

  1. Removals
    - Activity Points (Repeatable): All achievements with stage='activity' and associated points
    - Task Achievements (Setup Bonuses): Level completion achievements (fuel_level_*, boosters_level_*, guidance_level_*)
    - First Week Active: The 7-day streak milestone
    - All earned points from users in launch_points_ledger for these categories
    - Update team total_launch_points to reflect removed points

  2. Additions
    - Team Communicator (50 Team Chats): 100 points
    - Team Chat Champion (200 Team Chats): 200 points

  3. Cleanup
    - Drop activity tracking triggers that award repeatable points
    - Drop activity tracking functions

  4. Security
    - No security changes needed - existing RLS policies remain
*/

-- Step 1: Calculate points to remove per user and update team totals
DO $$
DECLARE
  v_user_record RECORD;
BEGIN
  FOR v_user_record IN 
    SELECT 
      lpl.user_id,
      u.team_id,
      SUM(lpl.points) as total_points
    FROM launch_points_ledger lpl
    JOIN public.users u ON u.id = lpl.user_id
    WHERE lpl.stage IN ('activity', 'ongoing')
       OR lpl.reason LIKE '%_level_%'
       OR lpl.reason = 'milestone_first_week_active'
       OR lpl.reason = 'ongoing_streak_7_days'
    GROUP BY lpl.user_id, u.team_id
  LOOP
    IF v_user_record.team_id IS NOT NULL THEN
      UPDATE teams 
      SET total_launch_points = GREATEST(0, total_launch_points - v_user_record.total_points)
      WHERE id = v_user_record.team_id;
    END IF;
    
    UPDATE user_launch_status
    SET total_points = GREATEST(0, total_points - v_user_record.total_points)
    WHERE user_id = v_user_record.user_id;
  END LOOP;
END $$;

-- Step 2: Delete points from ledger
DELETE FROM launch_points_ledger
WHERE stage IN ('activity', 'ongoing')
   OR reason LIKE '%_level_%'
   OR reason = 'milestone_first_week_active'
   OR reason = 'ongoing_streak_7_days';

-- Step 3: Delete first_week_active from user_milestones (uses milestone_type column)
DELETE FROM user_milestones
WHERE milestone_type = 'first_week_active';

-- Step 4: Delete achievements from launch_achievements
DELETE FROM launch_achievements
WHERE stage = 'activity'
   OR achievement_key LIKE '%_level_%';

-- Step 5: Drop activity tracking triggers
DROP TRIGGER IF EXISTS track_chat_activity_trigger ON astra_chats;
DROP TRIGGER IF EXISTS track_report_activity_trigger ON astra_reports;
DROP TRIGGER IF EXISTS track_visualization_activity_trigger ON saved_visualizations;

-- Step 6: Drop activity tracking functions
DROP FUNCTION IF EXISTS track_chat_activity() CASCADE;
DROP FUNCTION IF EXISTS track_report_activity() CASCADE;
DROP FUNCTION IF EXISTS track_visualization_activity() CASCADE;

-- Step 7: Update consecutive days streak function to remove first_week_active awarding
CREATE OR REPLACE FUNCTION update_consecutive_days_streak(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_streak RECORD;
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

-- Step 8: Add new Team Chat milestone achievements
INSERT INTO launch_achievements (achievement_key, name, description, stage, level, points_value, icon, display_order, is_active)
VALUES 
  ('milestone_50_team_chats', 'Team Communicator', 'Send 50 team chat messages', 'milestone', 1, 100, 'users', 2000, true),
  ('milestone_200_team_chats', 'Team Chat Champion', 'Send 200 team chat messages', 'milestone', 2, 200, 'message-square', 2001, true)
ON CONFLICT (achievement_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  points_value = EXCLUDED.points_value,
  is_active = EXCLUDED.is_active;

-- Step 9: Create function to check team chat milestones (uses astra_chats with mode='team')
CREATE OR REPLACE FUNCTION check_team_chat_milestones(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_team_chat_count integer;
  v_team_id uuid;
BEGIN
  SELECT team_id INTO v_team_id FROM public.users WHERE id = p_user_id;
  
  SELECT COUNT(*) INTO v_team_chat_count
  FROM astra_chats
  WHERE user_id = p_user_id 
    AND mode = 'team' 
    AND (message_type = 'user' OR message_type IS NULL);
  
  IF v_team_chat_count >= 50 THEN
    IF NOT EXISTS (SELECT 1 FROM user_milestones WHERE user_id = p_user_id AND milestone_type = 'milestone_50_team_chats') THEN
      INSERT INTO user_milestones (user_id, milestone_type, milestone_value)
      VALUES (p_user_id, 'milestone_50_team_chats', jsonb_build_object('count', v_team_chat_count, 'points', 100));
      
      INSERT INTO launch_points_ledger (user_id, points, reason, reason_display, stage, metadata)
      VALUES (p_user_id, 100, 'milestone_50_team_chats', 'Team Communicator', 'milestone',
              jsonb_build_object('team_chat_count', v_team_chat_count));
      
      IF v_team_id IS NOT NULL THEN
        UPDATE teams SET total_launch_points = total_launch_points + 100 WHERE id = v_team_id;
        UPDATE user_launch_status SET total_points = total_points + 100 WHERE user_id = p_user_id;
      END IF;
    END IF;
  END IF;
  
  IF v_team_chat_count >= 200 THEN
    IF NOT EXISTS (SELECT 1 FROM user_milestones WHERE user_id = p_user_id AND milestone_type = 'milestone_200_team_chats') THEN
      INSERT INTO user_milestones (user_id, milestone_type, milestone_value)
      VALUES (p_user_id, 'milestone_200_team_chats', jsonb_build_object('count', v_team_chat_count, 'points', 200));
      
      INSERT INTO launch_points_ledger (user_id, points, reason, reason_display, stage, metadata)
      VALUES (p_user_id, 200, 'milestone_200_team_chats', 'Team Chat Champion', 'milestone',
              jsonb_build_object('team_chat_count', v_team_chat_count));
      
      IF v_team_id IS NOT NULL THEN
        UPDATE teams SET total_launch_points = total_launch_points + 200 WHERE id = v_team_id;
        UPDATE user_launch_status SET total_points = total_points + 200 WHERE user_id = p_user_id;
      END IF;
    END IF;
  END IF;
END;
$$;

-- Step 10: Create trigger for team chat milestones on astra_chats
CREATE OR REPLACE FUNCTION check_team_chat_milestone_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.mode = 'team' AND (NEW.message_type = 'user' OR NEW.message_type IS NULL) AND NEW.user_id IS NOT NULL THEN
    PERFORM check_team_chat_milestones(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_team_chat_milestone_trigger ON astra_chats;
CREATE TRIGGER check_team_chat_milestone_trigger
  AFTER INSERT ON astra_chats
  FOR EACH ROW
  EXECUTE FUNCTION check_team_chat_milestone_trigger();