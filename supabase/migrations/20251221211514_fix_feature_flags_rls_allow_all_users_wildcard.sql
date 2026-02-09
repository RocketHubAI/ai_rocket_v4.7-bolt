/*
  # Fix Feature Flags RLS to allow *ALL_USERS* wildcard

  1. Problem
    - Users can only see feature flags where email matches their own
    - The *ALL_USERS* wildcard entry is not visible to regular users
    - This prevents the new_mission_control_page flag from being read

  2. Solution
    - Update the RLS policy to also allow reading entries with email = '*ALL_USERS*'

  3. Changes
    - Drop existing "Users can view feature flags by email" policy
    - Create new policy that allows reading if email matches user OR email is '*ALL_USERS*'
*/

DROP POLICY IF EXISTS "Users can view feature flags by email" ON feature_flags;

CREATE POLICY "Users can view feature flags by email or wildcard"
  ON feature_flags
  FOR SELECT
  TO authenticated
  USING (
    email IS NOT NULL 
    AND (
      auth.jwt() ->> 'email' = email 
      OR email = '*ALL_USERS*'
    )
  );
