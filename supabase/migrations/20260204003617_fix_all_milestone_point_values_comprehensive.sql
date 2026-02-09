/*
  # Fix All Milestone Point Values to Match Specification

  1. Problems Found
    - Message Milestones: 500 msgs awards 150 (should be 250), 1000 msgs awards 200 (should be 500)
    - Visualization Milestones: 25 viz awards 200 (should be 300), 100 viz awards 250 (should be 500)
    - Report Milestones: 3 reports awards 200 (should be 100), missing 25 reports (should be 500)
    - Some functions missing user_launch_status.total_points updates

  2. Correct Values (from launch_achievements table and UI)
    - Messages: 100=100pts, 500=250pts, 1000=500pts
    - Visualizations: 5=150pts, 25=300pts, 100=500pts
    - Reports: 3=100pts, 10=250pts, 25=500pts
    - Team Chat: 50=100pts, 200=200pts (already correct)

  3. Backfill
    - Fix one user (clay@rockethub.ai) who got 150pts instead of 250pts for 500 messages

  4. Security
    - All functions remain SECURITY DEFINER
    - No RLS policy changes needed
*/

-- Step 1: Fix track_message_activity() function with correct point values
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
    IF v_today_messages >= 10 THEN
      IF NOT EXISTS (
        SELECT 1 FROM user_activity_tracking
        WHERE id = v_record_id AND daily_power_user_awarded = true
      ) THEN
        INSERT INTO launch_points_ledger (user_id, points, reason, reason_display, stage, metadata)
        VALUES (NEW.user_id, 25, 'milestone_daily_power_user', 'Daily Power User', 'milestone',
                jsonb_build_object('date', CURRENT_DATE, 'messages', v_today_messages));

        UPDATE user_activity_tracking SET daily_power_user_awarded = true WHERE id = v_record_id;
        UPDATE user_launch_status SET total_points = total_points + 25 WHERE user_id = NEW.user_id;

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

        UPDATE user_launch_status SET total_points = total_points + 100 WHERE user_id = NEW.user_id;

        IF v_team_id IS NOT NULL THEN
          UPDATE teams SET total_launch_points = total_launch_points + 100 WHERE id = v_team_id;
        END IF;
      END IF;
    END IF;

    -- 500 total messages milestone - FIXED: 250 points (was 150)
    IF v_total_messages = 500 THEN
      IF NOT EXISTS (SELECT 1 FROM user_milestones WHERE user_id = NEW.user_id AND milestone_type = 'messages_500') THEN
        INSERT INTO user_milestones (user_id, milestone_type, milestone_value, achieved_at)
        VALUES (NEW.user_id, 'messages_500', jsonb_build_object('points', 250, 'count', v_total_messages), now());

        INSERT INTO launch_points_ledger (user_id, points, reason, reason_display, stage, metadata)
        VALUES (NEW.user_id, 250, 'milestone_messages_500', '500 Messages', 'milestone',
                jsonb_build_object('total_messages', v_total_messages));

        UPDATE user_launch_status SET total_points = total_points + 250 WHERE user_id = NEW.user_id;

        IF v_team_id IS NOT NULL THEN
          UPDATE teams SET total_launch_points = total_launch_points + 250 WHERE id = v_team_id;
        END IF;
      END IF;
    END IF;

    -- 1000 total messages milestone - FIXED: 500 points (was 200)
    IF v_total_messages = 1000 THEN
      IF NOT EXISTS (SELECT 1 FROM user_milestones WHERE user_id = NEW.user_id AND milestone_type = 'messages_1000') THEN
        INSERT INTO user_milestones (user_id, milestone_type, milestone_value, achieved_at)
        VALUES (NEW.user_id, 'messages_1000', jsonb_build_object('points', 500, 'count', v_total_messages), now());

        INSERT INTO launch_points_ledger (user_id, points, reason, reason_display, stage, metadata)
        VALUES (NEW.user_id, 500, 'milestone_messages_1000', '1000 Messages', 'milestone',
                jsonb_build_object('total_messages', v_total_messages));

        UPDATE user_launch_status SET total_points = total_points + 500 WHERE user_id = NEW.user_id;

        IF v_team_id IS NOT NULL THEN
          UPDATE teams SET total_launch_points = total_launch_points + 500 WHERE id = v_team_id;
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Step 2: Fix track_visualization_milestone() function with correct point values
CREATE OR REPLACE FUNCTION public.track_visualization_milestone()
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

    -- 5 visualizations milestone - 150 points (correct)
    IF v_total_viz = 5 THEN
      IF NOT EXISTS (SELECT 1 FROM user_milestones WHERE user_id = NEW.user_id AND milestone_type = 'visualizations_5') THEN
        INSERT INTO user_milestones (user_id, milestone_type, milestone_value, achieved_at)
        VALUES (NEW.user_id, 'visualizations_5', jsonb_build_object('points', 150, 'count', v_total_viz), now());

        INSERT INTO launch_points_ledger (user_id, points, reason, reason_display, stage, metadata)
        VALUES (NEW.user_id, 150, 'milestone_visualizations_5', '5 Visualizations Saved', 'milestone',
                jsonb_build_object('total_visualizations', v_total_viz));

        UPDATE user_launch_status SET total_points = total_points + 150 WHERE user_id = NEW.user_id;

        IF v_team_id IS NOT NULL THEN
          UPDATE teams SET total_launch_points = total_launch_points + 150 WHERE id = v_team_id;
        END IF;
      END IF;
    END IF;

    -- 25 visualizations milestone - FIXED: 300 points (was 200)
    IF v_total_viz = 25 THEN
      IF NOT EXISTS (SELECT 1 FROM user_milestones WHERE user_id = NEW.user_id AND milestone_type = 'visualizations_25') THEN
        INSERT INTO user_milestones (user_id, milestone_type, milestone_value, achieved_at)
        VALUES (NEW.user_id, 'visualizations_25', jsonb_build_object('points', 300, 'count', v_total_viz), now());

        INSERT INTO launch_points_ledger (user_id, points, reason, reason_display, stage, metadata)
        VALUES (NEW.user_id, 300, 'milestone_visualizations_25', '25 Visualizations Saved', 'milestone',
                jsonb_build_object('total_visualizations', v_total_viz));

        UPDATE user_launch_status SET total_points = total_points + 300 WHERE user_id = NEW.user_id;

        IF v_team_id IS NOT NULL THEN
          UPDATE teams SET total_launch_points = total_launch_points + 300 WHERE id = v_team_id;
        END IF;
      END IF;
    END IF;

    -- 100 visualizations milestone - FIXED: 500 points (was 250)
    IF v_total_viz = 100 THEN
      IF NOT EXISTS (SELECT 1 FROM user_milestones WHERE user_id = NEW.user_id AND milestone_type = 'visualizations_100') THEN
        INSERT INTO user_milestones (user_id, milestone_type, milestone_value, achieved_at)
        VALUES (NEW.user_id, 'visualizations_100', jsonb_build_object('points', 500, 'count', v_total_viz), now());

        INSERT INTO launch_points_ledger (user_id, points, reason, reason_display, stage, metadata)
        VALUES (NEW.user_id, 500, 'milestone_visualizations_100', '100 Visualizations Saved', 'milestone',
                jsonb_build_object('total_visualizations', v_total_viz));

        UPDATE user_launch_status SET total_points = total_points + 500 WHERE user_id = NEW.user_id;

        IF v_team_id IS NOT NULL THEN
          UPDATE teams SET total_launch_points = total_launch_points + 500 WHERE id = v_team_id;
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Step 3: Fix track_scheduled_report_milestone() function with correct point values
CREATE OR REPLACE FUNCTION public.track_scheduled_report_milestone()
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

    -- Count total scheduled reports for this user
    SELECT COUNT(*) INTO v_total_scheduled
    FROM astra_reports
    WHERE (created_by_user_id = v_user_id OR user_id = v_user_id)
    AND is_active = true
    AND schedule_type IS NOT NULL;

    -- 3 scheduled reports milestone - FIXED: 100 points (was 200)
    IF v_total_scheduled = 3 THEN
      IF NOT EXISTS (SELECT 1 FROM user_milestones WHERE user_id = v_user_id AND milestone_type = 'scheduled_reports_3') THEN
        INSERT INTO user_milestones (user_id, milestone_type, milestone_value, achieved_at)
        VALUES (v_user_id, 'scheduled_reports_3', jsonb_build_object('points', 100, 'count', v_total_scheduled), now());

        INSERT INTO launch_points_ledger (user_id, points, reason, reason_display, stage, metadata)
        VALUES (v_user_id, 100, 'milestone_scheduled_reports_3', '3 Scheduled Reports', 'milestone',
                jsonb_build_object('total_scheduled', v_total_scheduled));

        UPDATE user_launch_status SET total_points = total_points + 100 WHERE user_id = v_user_id;

        IF v_team_id IS NOT NULL THEN
          UPDATE teams SET total_launch_points = total_launch_points + 100 WHERE id = v_team_id;
        END IF;
      END IF;
    END IF;

    -- 10 scheduled reports milestone - 250 points (correct)
    IF v_total_scheduled = 10 THEN
      IF NOT EXISTS (SELECT 1 FROM user_milestones WHERE user_id = v_user_id AND milestone_type = 'scheduled_reports_10') THEN
        INSERT INTO user_milestones (user_id, milestone_type, milestone_value, achieved_at)
        VALUES (v_user_id, 'scheduled_reports_10', jsonb_build_object('points', 250, 'count', v_total_scheduled), now());

        INSERT INTO launch_points_ledger (user_id, points, reason, reason_display, stage, metadata)
        VALUES (v_user_id, 250, 'milestone_scheduled_reports_10', '10 Scheduled Reports', 'milestone',
                jsonb_build_object('total_scheduled', v_total_scheduled));

        UPDATE user_launch_status SET total_points = total_points + 250 WHERE user_id = v_user_id;

        IF v_team_id IS NOT NULL THEN
          UPDATE teams SET total_launch_points = total_launch_points + 250 WHERE id = v_team_id;
        END IF;
      END IF;
    END IF;

    -- 25 scheduled reports milestone - ADDED: 500 points (was missing)
    IF v_total_scheduled = 25 THEN
      IF NOT EXISTS (SELECT 1 FROM user_milestones WHERE user_id = v_user_id AND milestone_type = 'scheduled_reports_25') THEN
        INSERT INTO user_milestones (user_id, milestone_type, milestone_value, achieved_at)
        VALUES (v_user_id, 'scheduled_reports_25', jsonb_build_object('points', 500, 'count', v_total_scheduled), now());

        INSERT INTO launch_points_ledger (user_id, points, reason, reason_display, stage, metadata)
        VALUES (v_user_id, 500, 'milestone_scheduled_reports_25', '25 Scheduled Reports', 'milestone',
                jsonb_build_object('total_scheduled', v_total_scheduled));

        UPDATE user_launch_status SET total_points = total_points + 500 WHERE user_id = v_user_id;

        IF v_team_id IS NOT NULL THEN
          UPDATE teams SET total_launch_points = total_launch_points + 500 WHERE id = v_team_id;
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Step 4: Backfill missing points for clay@rockethub.ai (500 messages milestone)
-- They got 150 points but should have gotten 250 points (missing 100 points)
DO $$
DECLARE
  v_user_id uuid;
  v_team_id uuid;
BEGIN
  -- Get user ID
  SELECT id, team_id INTO v_user_id, v_team_id
  FROM public.users
  WHERE email = 'clay@rockethub.ai';

  IF v_user_id IS NOT NULL THEN
    -- Update the ledger entry to correct amount
    UPDATE launch_points_ledger
    SET points = 250
    WHERE user_id = v_user_id
    AND reason = 'milestone_messages_500'
    AND points = 150;

    -- Update the milestone value
    UPDATE user_milestones
    SET milestone_value = jsonb_set(milestone_value, '{points}', '250'::jsonb)
    WHERE user_id = v_user_id
    AND milestone_type = 'messages_500';

    -- Add the missing 100 points to user status
    UPDATE user_launch_status
    SET total_points = total_points + 100
    WHERE user_id = v_user_id;

    -- Add the missing 100 points to team total
    IF v_team_id IS NOT NULL THEN
      UPDATE teams
      SET total_launch_points = total_launch_points + 100
      WHERE id = v_team_id;
    END IF;

    RAISE NOTICE 'Backfilled 100 points for clay@rockethub.ai (500 messages milestone)';
  END IF;
END $$;
