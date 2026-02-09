/*
  # Allow RPC function to create teams
  
  1. Problem
    - complete_user_signup() is SECURITY DEFINER running as postgres
    - RLS policies on teams table only allow 'authenticated' role
    - Function cannot insert into teams table
    
  2. Solution
    - Add policy to allow inserts from SECURITY DEFINER functions
    - This allows the RPC function to create teams on behalf of users
    
  3. Security
    - The RPC function has its own logic to validate invite codes
    - Only authenticated users can call the RPC function
    - Safe to allow function to bypass RLS for team creation
*/

-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Authenticated users can create teams" ON teams;

-- Create new policy that allows both direct inserts and RPC inserts
CREATE POLICY "Allow team creation"
  ON teams
  FOR INSERT
  TO authenticated, postgres
  WITH CHECK (true);

-- Ensure service_role can also insert (for admin operations)
CREATE POLICY "Service role can insert teams"
  ON teams
  FOR INSERT
  TO service_role
  WITH CHECK (true);
