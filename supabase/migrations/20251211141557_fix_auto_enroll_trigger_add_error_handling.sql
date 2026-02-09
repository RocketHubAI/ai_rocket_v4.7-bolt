/*
  # Fix Auto-Enroll Trigger - Add Error Handling
  
  ## Problem
  The auto_enroll_in_launch_prep trigger may be failing silently or causing
  issues during signup. Need to add proper error handling.
  
  ## Solution
  Update the function to catch and log errors instead of failing the signup.
  
  ## Changes
  - Add exception handler to prevent signup failures from this trigger
  - Add proper search_path setting for security
*/

CREATE OR REPLACE FUNCTION public.auto_enroll_in_launch_prep()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Auto-enroll new users in Launch Prep (not marked as legacy)
  -- Wrapped in exception handler to prevent signup failures
  BEGIN
    INSERT INTO launch_preparation_eligible_users (email, notes, is_legacy_user)
    VALUES (NEW.email, 'Auto-enrolled new user', false)
    ON CONFLICT (email) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- Log the error but don't fail the signup
    RAISE WARNING 'auto_enroll_in_launch_prep: Failed to enroll user % - %', NEW.email, SQLERRM;
  END;

  RETURN NEW;
END;
$function$;
