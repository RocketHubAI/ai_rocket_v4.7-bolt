/*
  # Simplify Feature Flag Trigger to Bypass RLS

  1. Problem
    - RLS policies can't work properly during trigger execution
    - The trigger runs during auth.users INSERT, before user has full JWT context
    - Need to bypass RLS entirely for this operation
    
  2. Solution
    - Remove dependency on RLS policies for the trigger
    - Grant direct permissions to the trigger function owner (postgres)
    - Use SET LOCAL to temporarily bypass RLS within the function
    
  3. Changes
    - Update function to use SET LOCAL to bypass RLS for this transaction
    - Remove the new RLS policies that aren't working
*/

-- Remove the policies we just added (they won't work in trigger context)
DROP POLICY IF EXISTS "Allow feature flag migration on signup" ON feature_flags;
DROP POLICY IF EXISTS "Allow deleting email flags on signup" ON feature_flags;

-- Recreate the function with explicit RLS bypass
CREATE OR REPLACE FUNCTION migrate_email_feature_flags()
RETURNS TRIGGER AS $$
DECLARE
  migrated_count int;
BEGIN
  -- Bypass RLS for this function execution
  -- This is safe because:
  -- 1. Function is SECURITY DEFINER (runs with creator privileges)
  -- 2. Only processes feature flags for the user being created (NEW.email)
  -- 3. Does not expose data to the calling user
  
  BEGIN
    -- Disable RLS for this transaction only
    SET LOCAL session_replication_role = replica;
    
    -- Move any email-based feature flags to user_id based flags
    INSERT INTO feature_flags (user_id, feature_name, enabled, enabled_at)
    SELECT
      NEW.id,
      feature_name,
      enabled,
      enabled_at
    FROM feature_flags
    WHERE email = NEW.email
    ON CONFLICT (user_id, feature_name)
    DO UPDATE SET
      enabled = EXCLUDED.enabled,
      enabled_at = EXCLUDED.enabled_at;

    GET DIAGNOSTICS migrated_count = ROW_COUNT;

    -- Delete the old email-based flags only if migration succeeded
    IF migrated_count > 0 THEN
      DELETE FROM feature_flags
      WHERE email = NEW.email;
    END IF;
    
    -- Re-enable RLS
    SET LOCAL session_replication_role = DEFAULT;

  EXCEPTION WHEN OTHERS THEN
    -- Re-enable RLS even on error
    SET LOCAL session_replication_role = DEFAULT;
    -- Log the error but don't fail the signup
    RAISE WARNING 'Failed to migrate feature flags for user %: %', NEW.email, SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth;

COMMENT ON FUNCTION migrate_email_feature_flags IS 'Migrates email-based feature flags to user_id flags on signup. Uses session_replication_role to bypass RLS. Errors are logged but do not prevent signup.';
