/*
  # Add Onboarding Tracking to Moonshot Registrations

  1. Changes
    - Add `onboarding_started` boolean column to track if user has begun onboarding
    - Create function to sync onboarding status from user_launch_status table
    - Create trigger to automatically update moonshot_registrations when user_launch_status changes
    - Backfill existing data based on current user_launch_status records

  2. Logic
    - `onboarding_started` = TRUE if user has an entry in user_launch_status
    - `onboarding_completed` = TRUE if user_launch_status.is_launched = true
*/

-- Add onboarding_started column
ALTER TABLE moonshot_registrations 
ADD COLUMN IF NOT EXISTS onboarding_started boolean DEFAULT false;

-- Create function to sync onboarding status
CREATE OR REPLACE FUNCTION sync_moonshot_onboarding_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update moonshot_registrations for this user
  UPDATE moonshot_registrations
  SET 
    onboarding_started = true,
    onboarding_completed = NEW.is_launched,
    challenge_started_at = COALESCE(challenge_started_at, NEW.created_at)
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on user_launch_status for INSERT
DROP TRIGGER IF EXISTS sync_moonshot_onboarding_on_insert ON user_launch_status;
CREATE TRIGGER sync_moonshot_onboarding_on_insert
  AFTER INSERT ON user_launch_status
  FOR EACH ROW
  EXECUTE FUNCTION sync_moonshot_onboarding_status();

-- Create trigger on user_launch_status for UPDATE (when is_launched changes)
DROP TRIGGER IF EXISTS sync_moonshot_onboarding_on_update ON user_launch_status;
CREATE TRIGGER sync_moonshot_onboarding_on_update
  AFTER UPDATE OF is_launched ON user_launch_status
  FOR EACH ROW
  WHEN (OLD.is_launched IS DISTINCT FROM NEW.is_launched)
  EXECUTE FUNCTION sync_moonshot_onboarding_status();

-- Backfill existing data
UPDATE moonshot_registrations mr
SET 
  onboarding_started = true,
  onboarding_completed = uls.is_launched,
  challenge_started_at = COALESCE(mr.challenge_started_at, uls.created_at)
FROM user_launch_status uls
WHERE mr.user_id = uls.user_id;
