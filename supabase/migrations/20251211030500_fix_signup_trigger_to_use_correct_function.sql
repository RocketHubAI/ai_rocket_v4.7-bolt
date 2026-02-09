/*
  # Fix Signup Trigger to Use Correct Function
  
  ## Problem
  The trigger `on_auth_user_created` is calling `handle_new_user()` (old function)
  instead of `handle_new_user_signup()` (new function with proper error handling).
  
  This causes database errors when users try to sign up with invite codes because
  the old function doesn't have the SCENARIO 3 logic for pending team setup.
  
  ## Solution
  Update the trigger to call `handle_new_user_signup()` instead of `handle_new_user()`.
  
  ## Changes
  - Drop old trigger
  - Create new trigger calling `handle_new_user_signup()`
*/

-- Drop the old trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create new trigger calling the correct function
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_signup();
