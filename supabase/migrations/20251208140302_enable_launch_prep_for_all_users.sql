/*
  # Enable Launch Preparation for All Users

  ## Overview
  Enables the Launch Preparation Guide and Mission Control for ALL users (new and existing).
  Existing users will go through Launch Prep to earn points retroactively.

  ## Changes

  ### 1. Add Legacy User Tracking
  - Add `is_legacy_user` column to `launch_preparation_eligible_users`
  - Legacy users = existed before Launch Prep rollout (had team_id assigned)
  - These users see a special welcome message explaining the one-time setup

  ### 2. Backfill All Existing Users
  - Add all existing users to `launch_preparation_eligible_users`
  - Mark users who already have teams as legacy users
  - New users going forward will NOT be marked as legacy

  ### 3. Auto-Enrollment Trigger
  - Automatically enroll all new signups in Launch Prep
  - New users are NOT marked as legacy (they're truly new)

  ### 4. Initialize Launch Status for Existing Users
  - Create `user_launch_status` records for all existing users
  - Start them at 'fuel' stage with 0 points, not launched
  - Allow them to earn points retroactively

  ## Notes
  - Legacy users will see a one-time message explaining this is a new onboarding system
  - All users (new and existing) can now earn Launch Points
  - Mission Control becomes visible after users complete Launch Prep
*/

-- 1. Add legacy user flag to eligible users table
ALTER TABLE launch_preparation_eligible_users
ADD COLUMN IF NOT EXISTS is_legacy_user BOOLEAN DEFAULT false;

COMMENT ON COLUMN launch_preparation_eligible_users.is_legacy_user IS 
  'True for users who existed before Launch Prep rollout. These users see a special welcome message.';

-- 2. Backfill all existing users into eligible list
INSERT INTO launch_preparation_eligible_users (email, notes, is_legacy_user, added_by)
SELECT 
  au.email,
  CASE 
    WHEN u.team_id IS NOT NULL THEN 'Legacy user - had team before Launch Prep rollout'
    ELSE 'Existing user enrolled during Launch Prep rollout'
  END as notes,
  CASE 
    WHEN u.team_id IS NOT NULL THEN true
    ELSE false
  END as is_legacy_user,
  (SELECT id FROM auth.users WHERE email = 'clay@rockethub.co' LIMIT 1) as added_by
FROM auth.users au
LEFT JOIN users u ON u.id = au.id
WHERE au.email IS NOT NULL
ON CONFLICT (email) DO UPDATE SET
  is_legacy_user = EXCLUDED.is_legacy_user,
  notes = EXCLUDED.notes;

-- 3. Create auto-enrollment trigger for new signups
CREATE OR REPLACE FUNCTION auto_enroll_in_launch_prep()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-enroll new users in Launch Prep (not marked as legacy)
  INSERT INTO launch_preparation_eligible_users (email, notes, is_legacy_user)
  VALUES (NEW.email, 'Auto-enrolled new user', false)
  ON CONFLICT (email) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS auto_enroll_new_users_in_launch_prep ON auth.users;

-- Create trigger for auto-enrollment
CREATE TRIGGER auto_enroll_new_users_in_launch_prep
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION auto_enroll_in_launch_prep();

-- 4. Initialize launch status for all existing users who don't have one
INSERT INTO user_launch_status (user_id, current_stage, total_points, is_launched, daily_streak)
SELECT 
  u.id,
  'fuel' as current_stage,
  0 as total_points,
  false as is_launched,
  0 as daily_streak
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM user_launch_status WHERE user_id = u.id
)
ON CONFLICT (user_id) DO NOTHING;

-- 5. Initialize Fuel stage progress for all users who need it
INSERT INTO launch_preparation_progress (user_id, stage, level, points_earned, achievements)
SELECT 
  uls.user_id,
  'fuel' as stage,
  1 as level,
  0 as points_earned,
  '[]'::jsonb as achievements
FROM user_launch_status uls
WHERE NOT EXISTS (
  SELECT 1 FROM launch_preparation_progress 
  WHERE user_id = uls.user_id AND stage = 'fuel'
)
ON CONFLICT (user_id, stage) DO NOTHING;

-- 6. Add RLS policy to allow users to check their legacy status
DROP POLICY IF EXISTS "Users can check their own legacy status" ON launch_preparation_eligible_users;

CREATE POLICY "Users can check their own legacy status"
  ON launch_preparation_eligible_users
  FOR SELECT
  TO authenticated
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

COMMENT ON FUNCTION auto_enroll_in_launch_prep IS 
  'Automatically enrolls all new signups in Launch Preparation Guide';
