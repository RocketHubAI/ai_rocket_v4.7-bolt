/*
  # Fix Before Trigger - Add Error Handling
  
  ## Problem
  The set_onboarding_metadata BEFORE trigger may be failing and blocking signups.
  
  ## Solution
  Add exception handler to prevent signup failures from this trigger.
*/

CREATE OR REPLACE FUNCTION public.set_onboarding_metadata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_invite_code text;
  invite_team_id uuid;
BEGIN
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
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Log but don't fail
    RAISE WARNING 'set_onboarding_metadata: Error for user % - %', NEW.email, SQLERRM;
  END;

  RETURN NEW;
END;
$function$;
