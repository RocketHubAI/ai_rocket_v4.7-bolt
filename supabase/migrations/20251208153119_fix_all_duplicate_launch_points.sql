/*
  # Fix Duplicate Launch Points for All Users

  ## What This Does
  Removes duplicate launch point awards that were caused by a race condition
  in the activity tracking system. Keeps only the first award of each achievement
  type for all users and recalculates total points.

  ## Changes
  1. Deletes duplicate entries from launch_points_ledger for all users  
  2. Recalculates and updates total_points for affected users
  3. Adds unique constraint to prevent future duplicates
*/

-- 1. Delete duplicate entries for ALL users, keeping only first occurrence
DELETE FROM launch_points_ledger
WHERE id IN (
  SELECT id
  FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY user_id, reason 
        ORDER BY created_at
      ) as rn
    FROM launch_points_ledger
    WHERE reason NOT LIKE 'ongoing_%'  -- Allow ongoing activities to repeat
  ) sub
  WHERE rn > 1
);

-- 2. Recalculate total points for all affected users
UPDATE user_launch_status uls
SET 
  total_points = (
    SELECT COALESCE(SUM(points), 0)
    FROM launch_points_ledger lpl
    WHERE lpl.user_id = uls.user_id
  ),
  updated_at = now()
WHERE EXISTS (
  SELECT 1 FROM launch_points_ledger WHERE user_id = uls.user_id
);

-- 3. Add partial unique index to prevent duplicate achievements per user
-- This allows multiple daily_active entries (different days) but prevents duplicate achievements
CREATE UNIQUE INDEX IF NOT EXISTS idx_launch_points_unique_achievement
ON launch_points_ledger (user_id, reason)
WHERE reason NOT LIKE 'ongoing_%';

-- Log what we did
COMMENT ON INDEX idx_launch_points_unique_achievement IS 
'Prevents duplicate achievement awards. Allows ongoing activities like daily_active to repeat.';
