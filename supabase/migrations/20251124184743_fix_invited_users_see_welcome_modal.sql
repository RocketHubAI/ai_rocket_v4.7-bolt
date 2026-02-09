/*
  # Fix Invited Users to See Welcome Modal and Tour
  
  1. Problem
    - Invited users joining existing teams have `onboarding_dismissed: true` set in metadata
    - This prevents them from seeing the Welcome Modal and Interactive Tour
    - They should see these on first login to get oriented with the platform
    
  2. Root Cause
    - The `set_onboarding_metadata()` BEFORE trigger sets `onboarding_dismissed: true`
    - This was originally added to prevent OnboardingScreen, but now we want them to see Welcome Modal
    
  3. Solution
    - Remove the `onboarding_dismissed` flag from the BEFORE trigger
    - Invited users will now see the Welcome Modal and Interactive Tour
    - They still won't see OnboardingScreen or Guided Setup (handled by frontend logic)
    
  4. Changes
    - Update `set_onboarding_metadata()` function to NOT set `onboarding_dismissed`
    - Clear the flag for existing invited users so they see the modal on next login
*/

-- Update the BEFORE trigger to NOT set onboarding_dismissed
CREATE OR REPLACE FUNCTION set_onboarding_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_invite_code text;
  invite_team_id uuid;
BEGIN
  -- Extract invite code from user metadata
  user_invite_code := NEW.raw_user_meta_data->>'invite_code';
  
  -- Only process if invite code exists
  IF user_invite_code IS NOT NULL THEN
    -- Get invite code details
    SELECT team_id
    INTO invite_team_id
    FROM invite_codes
    WHERE code = UPPER(user_invite_code)
      AND is_active = true
      AND current_uses < max_uses
      AND (expires_at IS NULL OR expires_at > now())
      AND (invited_email IS NULL OR invited_email = NEW.email)
    LIMIT 1;
    
    -- If invite has a team_id, this is joining an existing team
    -- DO NOT set onboarding_dismissed - let them see the Welcome Modal
    -- The frontend will handle preventing OnboardingScreen and Guided Setup
  END IF;
  
  RETURN NEW;
END;
$$;

-- Clear onboarding_dismissed for existing invited users who aren't team creators
-- This allows them to see the Welcome Modal on their next login
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data - 'onboarding_dismissed'
WHERE 
  raw_user_meta_data->>'onboarding_dismissed' = 'true'
  AND raw_user_meta_data->>'team_id' IS NOT NULL
  AND id NOT IN (
    SELECT created_by FROM teams WHERE created_by IS NOT NULL
  );

COMMENT ON FUNCTION set_onboarding_metadata IS 'BEFORE trigger for new user signup - handles invite code metadata setup without blocking Welcome Modal';
