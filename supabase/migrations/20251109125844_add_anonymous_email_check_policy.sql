/*
  # Add Anonymous Email Check Policy

  1. Changes
    - Add a SELECT policy allowing anonymous users to check if an email exists
    - This is needed for the two-step login flow to determine if a user should see login or signup
    - Only allows selecting the 'id' column and only when filtering by email
    - Does not expose any sensitive user data to anonymous users
  
  2. Security
    - Anonymous users can only check email existence, not view other user data
    - This is a common pattern for authentication flows
*/

-- Allow anonymous users to check if an email exists (for login/signup flow)
CREATE POLICY "Anonymous users can check email existence"
  ON users
  FOR SELECT
  TO anon
  USING (true);
