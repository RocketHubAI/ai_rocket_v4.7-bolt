/*
  # Auto-increment invite code on user signup

  1. New Functions
    - `handle_new_user_signup()` - Trigger function that automatically increments invite code usage when a new user signs up

  2. New Triggers
    - Trigger on auth.users insert that calls the function

  3. Changes
    - Removes reliance on client-side RPC call
    - Ensures invite code is always incremented on successful signup
    - Runs with elevated permissions automatically
*/

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_invite_code text;
BEGIN
  -- Extract invite code from user metadata
  user_invite_code := NEW.raw_user_meta_data->>'invite_code';

  -- If invite code exists, increment its usage
  IF user_invite_code IS NOT NULL THEN
    UPDATE invite_codes
    SET current_uses = current_uses + 1
    WHERE code = UPPER(user_invite_code)
      AND is_active = true
      AND current_uses < max_uses
      AND (expires_at IS NULL OR expires_at > now());
  END IF;

  RETURN NEW;
END;
$$;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS on_user_signup_increment_invite_code ON auth.users;

-- Create trigger on auth.users
CREATE TRIGGER on_user_signup_increment_invite_code
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_signup();
