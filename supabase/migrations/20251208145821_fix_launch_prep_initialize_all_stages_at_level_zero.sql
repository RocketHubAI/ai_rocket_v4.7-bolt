/*
  # Fix Launch Preparation - Initialize All Stages at Level 0

  ## Problem
  The previous migration (20251208140302) only initialized Fuel stage at level 1,
  but didn't initialize Boosters and Guidance stages at all. This caused:
  - Users entering Boosters for first time were already at level 1
  - Inconsistent initialization across stages
  - Users couldn't experience completing Level 1 properly

  ## Solution
  1. Update existing Fuel records from level 1 to level 0 (for users who haven't progressed)
  2. Initialize missing Boosters records at level 0
  3. Initialize missing Guidance records at level 0
  4. Ensure ALL users have all three stages starting at level 0

  ## Changes
  - Reset Fuel stage to level 0 for users still at level 1 with no achievements
  - Create Boosters stage records at level 0 for all users missing them
  - Create Guidance stage records at level 0 for all users missing them

  ## Security
  - No RLS changes needed
  - Maintains data integrity
*/

-- 1. Reset Fuel stage to level 0 for users who are still at level 1 with no progress
UPDATE launch_preparation_progress
SET 
  level = 0,
  updated_at = now()
WHERE stage = 'fuel'
  AND level = 1
  AND points_earned = 0
  AND achievements = '[]'::jsonb;

-- 2. Initialize Boosters stage at level 0 for all users who need it
INSERT INTO launch_preparation_progress (user_id, stage, level, points_earned, achievements)
SELECT 
  uls.user_id,
  'boosters' as stage,
  0 as level,
  0 as points_earned,
  '[]'::jsonb as achievements
FROM user_launch_status uls
WHERE NOT EXISTS (
  SELECT 1 FROM launch_preparation_progress 
  WHERE user_id = uls.user_id AND stage = 'boosters'
)
ON CONFLICT (user_id, stage) DO NOTHING;

-- 3. Initialize Guidance stage at level 0 for all users who need it
INSERT INTO launch_preparation_progress (user_id, stage, level, points_earned, achievements)
SELECT 
  uls.user_id,
  'guidance' as stage,
  0 as level,
  0 as points_earned,
  '[]'::jsonb as achievements
FROM user_launch_status uls
WHERE NOT EXISTS (
  SELECT 1 FROM launch_preparation_progress 
  WHERE user_id = uls.user_id AND stage = 'guidance'
)
ON CONFLICT (user_id, stage) DO NOTHING;

-- 4. Verify all users now have all three stages
DO $$
DECLARE
  missing_count INTEGER;
BEGIN
  -- Count users who don't have all 3 stages
  SELECT COUNT(*) INTO missing_count
  FROM user_launch_status uls
  WHERE (
    SELECT COUNT(*) 
    FROM launch_preparation_progress 
    WHERE user_id = uls.user_id
  ) < 3;
  
  IF missing_count > 0 THEN
    RAISE NOTICE 'Warning: % users still missing stage records', missing_count;
  ELSE
    RAISE NOTICE 'Success: All users have all 3 stage records';
  END IF;
END $$;
