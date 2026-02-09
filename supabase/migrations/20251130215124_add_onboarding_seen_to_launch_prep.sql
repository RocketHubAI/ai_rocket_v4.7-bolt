/*
  # Add Onboarding Tracking to Launch Preparation

  1. Changes
    - Add `has_seen_onboarding` boolean field to `launch_preparation_eligible` table
    - Default to false for all users
    - Allows tracking whether user has completed the welcome onboarding screens

  2. Purpose
    - Track first-time user onboarding completion
    - Ensure users only see welcome screens once
    - Improve user experience by not repeating onboarding
*/

-- Add onboarding tracking field
ALTER TABLE launch_preparation_eligible 
ADD COLUMN IF NOT EXISTS has_seen_onboarding BOOLEAN DEFAULT false;

-- Set existing users to true (they've already started)
UPDATE launch_preparation_eligible 
SET has_seen_onboarding = true 
WHERE is_eligible = true;

-- For testing: Reset specific user to see onboarding
UPDATE launch_preparation_eligible 
SET has_seen_onboarding = false 
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'clayspeakman@gmail.com'
);
