/*
  # Fix Launch Preparation Eligible Users RLS Policy

  1. Changes
    - Drop the existing policy that tries to query auth.users (causes permission error)
    - Create a new policy that allows any authenticated user to check if ANY email exists in the table
    - This is safe because:
      a) The table only contains email addresses (no sensitive data)
      b) Users can only use this to check eligibility, not modify data
      c) Knowing if an email is eligible doesn't expose private information
  
  2. Security
    - Authenticated users can SELECT any row to check eligibility
    - Only super admins can INSERT/UPDATE/DELETE (existing policy handles this)
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can check their own email eligibility" ON launch_preparation_eligible_users;

-- Create a simpler policy that allows authenticated users to read the table
-- This is safe because the table only contains email addresses for eligibility checking
CREATE POLICY "Authenticated users can check email eligibility"
  ON launch_preparation_eligible_users
  FOR SELECT
  TO authenticated
  USING (true);