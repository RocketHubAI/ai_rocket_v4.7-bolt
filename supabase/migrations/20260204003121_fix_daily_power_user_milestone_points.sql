/*
  # Fix Daily Power User Milestone Points Tracking

  1. Problem
    - Users achieving the "10 messages in a day" milestone get 25 points added to ledger and team total
    - BUT the points are NOT added to user_launch_status.total_points
    - This causes user's displayed points to be incorrect

  2. Fix
    - Update track_message_activity() function to also update user_launch_status.total_points
    - Change from exact match (= 10) to greater-or-equal (>= 10) to be more forgiving
    - Backfill missing points for all affected users

  3. Security
    - Function remains SECURITY DEFINER
    - No RLS policy changes needed
*/

-- Step 1: Fix the track_message_activity() function
CREATE OR REPLACE FUNCTION public.track_message_activity()
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

    -- Check for Daily Power User milestone (10+ messages in a day)
    -- Changed from = to >= to be more forgiving
    IF v_today_messages >= 10 THEN
      -- Check if not already awarded today
      IF NOT EXISTS (
        SELECT 1 FROM user_activity_tracking
        WHERE id = v_record_id AND daily_power_user_awarded = true
      ) THEN
        INSERT INTO launch_points_ledger (user_id, points, reason, reason_display, stage, metadata)
        VALUES (NEW.user_id, 25, 'milestone_daily_power_user', 'Daily Power User', 'milestone',
                jsonb_build_object('date', CURRENT_DATE, 'messages', v_today_messages));

        UPDATE user_activity_tracking SET daily_power_user_awarded = true WHERE id = v_record_id;

        -- FIXED: Also update user_launch_status.total_points
        UPDATE user_launch_status
        SET total_points = total_points + 25
        WHERE user_id = NEW.user_id;

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

-- Step 2: Backfill missing points for all users who achieved the milestone
-- Add the 25 points to user_launch_status for everyone with milestone_daily_power_user in their ledger
DO $$
DECLARE
  v_user_record RECORD;
  v_milestone_count integer;
  v_points_to_add integer;
BEGIN
  -- For each user who has daily_power_user milestone entries
  FOR v_user_record IN
    SELECT
      lpl.user_id,
      COUNT(*) as achievement_count,
      COUNT(*) * 25 as total_points_earned
    FROM launch_points_ledger lpl
    WHERE lpl.reason = 'milestone_daily_power_user'
    GROUP BY lpl.user_id
  LOOP
    -- Ensure user_launch_status record exists
    INSERT INTO user_launch_status (user_id, total_points)
    VALUES (v_user_record.user_id, 0)
    ON CONFLICT (user_id) DO NOTHING;

    -- Add the missing points to user_launch_status
    UPDATE user_launch_status
    SET total_points = total_points + v_user_record.total_points_earned
    WHERE user_id = v_user_record.user_id;

    RAISE NOTICE 'Added % points to user % (% achievements)',
      v_user_record.total_points_earned, v_user_record.user_id, v_user_record.achievement_count;
  END LOOP;
END $$;
