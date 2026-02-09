/*
  # Fix Launch Points Constraint to Allow Repeatable Activities

  ## Problem
  The unique constraint `idx_launch_points_unique_achievement` was preventing users from
  creating multiple reports because it blocked duplicate 'activity_report_created' entries.
  
  The constraint was designed to prevent duplicate ONE-TIME achievements, but activities
  like creating reports, team chat messages, and saving visualizations should be allowed
  to repeat.

  ## Solution
  Update the constraint to exclude 'activity_%' reasons (repeatable activities) in addition
  to 'ongoing_%' reasons.

  ## Changes
  1. Drop the existing constraint
  2. Recreate with updated WHERE clause that allows activity_ prefixed reasons to repeat
*/

-- Drop the existing constraint
DROP INDEX IF EXISTS idx_launch_points_unique_achievement;

-- Recreate with updated WHERE clause
-- This allows:
--   - 'ongoing_%' reasons to repeat (daily activities, etc.)
--   - 'activity_%' reasons to repeat (report created, visualization saved, team chat, etc.)
-- While still preventing duplicate:
--   - 'milestone_%' reasons (one-time milestones)
--   - Achievement reasons from the Fuel/Boosters/Guidance stages

CREATE UNIQUE INDEX idx_launch_points_unique_achievement
ON launch_points_ledger (user_id, reason)
WHERE reason NOT LIKE 'ongoing_%' 
  AND reason NOT LIKE 'activity_%';

COMMENT ON INDEX idx_launch_points_unique_achievement IS 
'Prevents duplicate achievement awards. Allows ongoing_ and activity_ prefixed reasons to repeat for daily/repeatable activities.';
