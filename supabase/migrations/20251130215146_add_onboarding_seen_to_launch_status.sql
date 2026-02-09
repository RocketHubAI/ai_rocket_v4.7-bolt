/*
  # Add Onboarding Tracking to Launch Status

  1. Changes
    - Add `has_seen_onboarding` boolean field to `user_launch_status` table
    - Default to false for all users
    - Allows tracking whether user has completed the welcome onboarding screens

  2. Purpose
    - Track first-time user onboarding completion
    - Ensure users only see welcome screens once
    - Improve user experience by not repeating onboarding
*/

-- Add onboarding tracking field
ALTER TABLE user_launch_status 
ADD COLUMN IF NOT EXISTS has_seen_onboarding BOOLEAN DEFAULT false;

-- Set existing users to true (they've already started)
UPDATE user_launch_status 
SET has_seen_onboarding = true 
WHERE is_launched = true OR total_points > 0;

-- For testing: Reset specific user to see onboarding
UPDATE user_launch_status 
SET has_seen_onboarding = false 
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'clayspeakman@gmail.com'
);