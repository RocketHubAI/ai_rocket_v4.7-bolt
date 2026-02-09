/*
  # Fix mark_preview_request_onboarded Trigger

  ## Problem
  The trigger function `mark_preview_request_onboarded` runs an UPDATE on
  `preview_requests` table, but RLS only allows super admins to update.
  Since the trigger runs in the context of the new user (not a super admin),
  the UPDATE is blocked by RLS, causing signup to fail with
  "Database error saving new user".

  ## Solution
  1. Recreate the function with SECURITY DEFINER to bypass RLS
  2. Add exception handler to prevent signup failures

  ## Affected Users
  Any new user trying to sign up who has a preview_requests entry
*/

-- Drop and recreate the function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION mark_preview_request_onboarded()
RETURNS TRIGGER AS $$
BEGIN
  -- Wrap in exception handler to never fail signup
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
  EXCEPTION WHEN OTHERS THEN
    -- Log the error but don't fail the signup
    RAISE WARNING 'mark_preview_request_onboarded: Failed for user % - %', NEW.email, SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
