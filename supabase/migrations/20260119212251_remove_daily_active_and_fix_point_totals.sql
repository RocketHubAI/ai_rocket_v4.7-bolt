/*
  # Remove Daily Active Points and Fix Point Totals

  1. Problem
    - Daily Active points are still being awarded by mark_user_active_today function
    - User total_points are out of sync with actual earned points
    - Points come from two sources: launch_preparation_progress and launch_points_ledger
    
  2. Solution
    - Update mark_user_active_today to NOT award daily active points (keep streak tracking only)
    - Delete all Daily Active entries from launch_points_ledger
    - Recalculate all user and team point totals correctly
    
  3. Impact
    - Daily Active points will no longer be awarded
    - All user point totals will be accurate
    - Team point totals will be recalculated
*/

-- Step 1: Update mark_user_active_today to remove daily active point awarding
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
  SELECT id, daily_points_awarded INTO v_record_id, v_already_active
  FROM user_activity_tracking
  WHERE user_id = p_user_id AND activity_date = CURRENT_DATE;
  
  IF v_record_id IS NULL THEN
    INSERT INTO user_activity_tracking (user_id, activity_date, message_count, daily_points_awarded)
    VALUES (p_user_id, CURRENT_DATE, 0, true)
    RETURNING id INTO v_record_id;
    v_already_active := true;
  END IF;
  
  IF NOT v_already_active THEN
    SELECT team_id INTO v_team_id FROM public.users WHERE id = p_user_id;
    
    UPDATE user_activity_tracking SET daily_points_awarded = true WHERE id = v_record_id;
    
    SELECT * INTO v_streak FROM user_consecutive_days WHERE user_id = p_user_id;
    
    IF v_streak IS NULL THEN
      INSERT INTO user_consecutive_days (user_id, current_streak, longest_streak, last_active_date, streak_start_date, streak_rewards_claimed)
      VALUES (p_user_id, 1, 1, CURRENT_DATE, CURRENT_DATE, 0);
      v_new_streak := 1;
    ELSIF v_streak.last_active_date = CURRENT_DATE THEN
      RETURN;
    ELSIF v_streak.last_active_date = CURRENT_DATE - 1 THEN
      v_new_streak := v_streak.current_streak + 1;
      UPDATE user_consecutive_days
      SET current_streak = v_new_streak,
          longest_streak = GREATEST(longest_streak, v_new_streak),
          last_active_date = CURRENT_DATE,
          updated_at = now()
      WHERE user_id = p_user_id;
    ELSE
      v_new_streak := 1;
      UPDATE user_consecutive_days
      SET current_streak = 1,
          last_active_date = CURRENT_DATE,
          streak_start_date = CURRENT_DATE,
          streak_rewards_claimed = 0,
          updated_at = now()
      WHERE user_id = p_user_id;
    END IF;
    
    SELECT streak_rewards_claimed INTO v_rewards_to_claim FROM user_consecutive_days WHERE user_id = p_user_id;
    
    IF v_new_streak >= 5 AND (v_new_streak / 5) > COALESCE(v_rewards_to_claim, 0) THEN
      INSERT INTO launch_points_ledger (user_id, points, reason, reason_display, stage, metadata)
      VALUES (p_user_id, 50, 'activity_5_day_streak', '5-Day Streak', 'activity',
              jsonb_build_object('streak_days', v_new_streak, 'streak_number', (v_new_streak / 5)));
      
      UPDATE user_consecutive_days
      SET streak_rewards_claimed = v_new_streak / 5
      WHERE user_id = p_user_id;
      
      IF v_team_id IS NOT NULL THEN
        UPDATE teams SET total_launch_points = total_launch_points + 50 WHERE id = v_team_id;
      END IF;
      
      UPDATE user_launch_status
      SET total_points = total_points + 50
      WHERE user_id = p_user_id;
    END IF;
  END IF;
END;
$$;

-- Step 2: Delete all Daily Active entries from ledger
DELETE FROM launch_points_ledger
WHERE reason IN ('activity_daily_active', 'ongoing_daily_active')
   OR reason_display = 'Daily Active';

-- Step 3: Recalculate all user point totals
-- Total = stage_points (from launch_preparation_progress) + ledger_points (from launch_points_ledger)
UPDATE user_launch_status uls
SET total_points = (
  SELECT COALESCE(SUM(lpp.points_earned), 0)
  FROM launch_preparation_progress lpp
  WHERE lpp.user_id = uls.user_id
) + (
  SELECT COALESCE(SUM(lpl.points), 0)
  FROM launch_points_ledger lpl
  WHERE lpl.user_id = uls.user_id
);

-- Step 4: Recalculate all team point totals
UPDATE teams t
SET total_launch_points = (
  SELECT COALESCE(SUM(uls.total_points), 0)
  FROM user_launch_status uls
  JOIN public.users u ON u.id = uls.user_id
  WHERE u.team_id = t.id
);
