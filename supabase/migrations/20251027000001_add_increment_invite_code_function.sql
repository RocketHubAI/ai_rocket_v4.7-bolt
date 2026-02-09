/*
  # Add function to increment invite code usage

  1. New Functions
    - `increment_invite_code_usage(invite_code_param text)` - Safely increments the usage count of an invite code

  2. Security
    - Function runs with SECURITY DEFINER to bypass RLS restrictions
    - Only increments active, valid, non-expired codes
    - Granted execute permission to authenticated users

  3. Changes
    - Replaces client-side direct table updates with secure server-side function
    - Ensures invite code usage is properly tracked even with RLS enabled
*/

-- Create a function to increment invite code usage
-- This runs with the permissions of the function owner (postgres/admin)
CREATE OR REPLACE FUNCTION increment_invite_code_usage(invite_code_param text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE invite_codes
  SET current_uses = current_uses + 1
  WHERE code = UPPER(invite_code_param)
    AND is_active = true
    AND current_uses < max_uses
    AND (expires_at IS NULL OR expires_at > now());
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION increment_invite_code_usage(text) TO authenticated;
