/*
  # Remove Daily Active Points from Ledger

  1. Problem
    - Daily Active points were deprecated but still exist in ledger
    - 35 entries totaling 330 points need to be removed

  2. Solution
    - Subtract points from user_launch_status and teams
    - Delete the ledger entries

  3. Impact
    - User and team point totals will be corrected
    - Points Activity will no longer show Daily Active entries
*/

-- Step 1: Update user and team totals
DO $$
DECLARE
  v_record RECORD;
BEGIN
  FOR v_record IN 
    SELECT 
      lpl.user_id,
      u.team_id,
      SUM(lpl.points) as total_points
    FROM launch_points_ledger lpl
    JOIN public.users u ON u.id = lpl.user_id
    WHERE lpl.reason IN ('activity_daily_active', 'ongoing_daily_active')
       OR lpl.reason_display = 'Daily Active'
    GROUP BY lpl.user_id, u.team_id
  LOOP
    IF v_record.team_id IS NOT NULL THEN
      UPDATE teams 
      SET total_launch_points = GREATEST(0, total_launch_points - v_record.total_points)
      WHERE id = v_record.team_id;
    END IF;
    
    UPDATE user_launch_status
    SET total_points = GREATEST(0, total_points - v_record.total_points)
    WHERE user_id = v_record.user_id;
  END LOOP;
END $$;

-- Step 2: Delete the Daily Active points from ledger
DELETE FROM launch_points_ledger
WHERE reason IN ('activity_daily_active', 'ongoing_daily_active')
   OR reason_display = 'Daily Active';
