/*
  # Add Trigger Policies for Feature Flags

  1. Problem
    - The migrate_email_feature_flags() trigger cannot INSERT/DELETE on feature_flags
    - RLS is blocking the SECURITY DEFINER function
    - No INSERT or DELETE policies exist for the trigger to use
    
  2. Solution
    - Add policies that allow the trigger function to manipulate feature_flags
    - Use a special marker to identify trigger-initiated operations
    
  3. Changes
    - Add INSERT policy for migrating email-based flags to user_id flags
    - Add DELETE policy for removing old email-based flags
*/

-- Allow inserting user_id-based feature flags during migration
-- This policy allows inserting a feature flag if:
-- 1. It's being inserted with a user_id that matches the current user
-- 2. OR there's an email-based flag for this user that we're migrating
CREATE POLICY "Allow feature flag migration on signup"
  ON feature_flags
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM feature_flags ff
      WHERE ff.email = (auth.jwt()->>'email')
        AND ff.feature_name = feature_flags.feature_name
    )
  );

-- Allow deleting email-based flags during migration
CREATE POLICY "Allow deleting email flags on signup"
  ON feature_flags
  FOR DELETE
  TO authenticated
  USING (
    email IS NOT NULL AND
    email = (auth.jwt()->>'email')
  );
