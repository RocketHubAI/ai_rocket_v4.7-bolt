/*
  # Add Onboarded Tracking to Preview Requests

  ## Overview
  Adds columns to track when preview requesters have created an account,
  separate from the "launched" status which tracks team readiness.

  ## 1. Changes
    - Add `onboarded` (boolean, default false) - Whether user created an account
    - Add `onboarded_at` (timestamptz, nullable) - When account was created
    - Add `onboarded_user_id` (uuid, nullable) - Reference to the user who signed up

  ## 2. Triggers
    - Auto-update `onboarded = true` when a user signs up with matching email
    - Set `onboarded_at` to the signup timestamp
    - Store the user ID for reference

  ## 3. Backfill
    - Update existing preview requests where users have already signed up

  ## 4. Important Notes
    - This is different from "launched" status
    - "Onboarded" = account created
    - "Launched" = team is ready and active
*/

-- Add onboarding tracking columns
ALTER TABLE preview_requests 
ADD COLUMN IF NOT EXISTS onboarded boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS onboarded_at timestamptz,
ADD COLUMN IF NOT EXISTS onboarded_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for filtering onboarded users
CREATE INDEX IF NOT EXISTS idx_preview_requests_onboarded 
ON preview_requests(onboarded);

-- Function to mark preview request as onboarded when user signs up
CREATE OR REPLACE FUNCTION mark_preview_request_onboarded()
RETURNS TRIGGER AS $$
BEGIN
  -- Update preview_requests where email matches
  UPDATE preview_requests
  SET 
    onboarded = true,
    onboarded_at = NEW.created_at,
    onboarded_user_id = NEW.id,
    updated_at = now()
  WHERE LOWER(email) = LOWER(NEW.email)
  AND onboarded = false;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run after user signup
DROP TRIGGER IF EXISTS trigger_mark_preview_request_onboarded ON auth.users;
CREATE TRIGGER trigger_mark_preview_request_onboarded
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION mark_preview_request_onboarded();

-- Backfill existing data: mark preview requests as onboarded if user already exists
UPDATE preview_requests pr
SET 
  onboarded = true,
  onboarded_at = u.created_at,
  onboarded_user_id = u.id,
  updated_at = now()
FROM auth.users u
WHERE LOWER(pr.email) = LOWER(u.email)
AND pr.onboarded = false;

-- Add helpful comments
COMMENT ON COLUMN preview_requests.onboarded IS 'Whether the user has created an account (not the same as launched)';
COMMENT ON COLUMN preview_requests.onboarded_at IS 'Timestamp when the user created their account';
COMMENT ON COLUMN preview_requests.onboarded_user_id IS 'Reference to the user who signed up with this email';
