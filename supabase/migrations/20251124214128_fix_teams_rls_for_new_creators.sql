/*
  # Fix teams RLS policy for new team creators
  
  1. Problem
    - New team creators cannot view their team immediately after creation
    - The SELECT policy checks auth.jwt() metadata for team_id
    - JWT metadata is not immediately updated after team creation
    - This causes the Guided Setup to fail because it cannot fetch team data
    
  2. Root Cause
    - Policy: "Team members can view their team"
    - Uses: (id = auth.jwt() -> 'user_metadata' ->> 'team_id')
    - But JWT is stale right after onboarding redirect
    
  3. Solution
    - Add additional policy that checks public.users table instead of JWT
    - This ensures immediate access to team data for new creators
    - Keep existing JWT-based policy for performance (most common case)
    
  4. Changes
    - Add new SELECT policy that checks public.users.team_id
    - This works even when JWT metadata is stale
*/

-- Add policy to allow users to view their team based on public.users table
-- This works even when JWT metadata is not yet updated
CREATE POLICY "Team members can view their team via users table"
  ON teams
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT team_id 
      FROM public.users 
      WHERE id = auth.uid()
    )
  );

COMMENT ON POLICY "Team members can view their team via users table" ON teams IS 
  'Allows users to view their team by checking public.users.team_id. This works even when JWT metadata is stale after signup.';
