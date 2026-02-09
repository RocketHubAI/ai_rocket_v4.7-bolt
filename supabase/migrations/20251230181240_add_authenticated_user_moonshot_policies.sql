/*
  # Add RLS policies for authenticated users on moonshot_registrations

  Allows authenticated users to view and update their own team's registration.

  ## 1. New Policies

  ### SELECT Policy
  - Authenticated users can view registrations for their own team

  ### UPDATE Policy  
  - Authenticated users can update registrations for their own team

  ## 2. Notes
  - Uses user_metadata->team_id to match against registration team_id
  - Super admin policies remain unchanged
*/

CREATE POLICY "Users can view own team registration"
  ON moonshot_registrations
  FOR SELECT
  TO authenticated
  USING (
    team_id IS NOT NULL 
    AND team_id = (auth.jwt() -> 'user_metadata' ->> 'team_id')::uuid
  );

CREATE POLICY "Users can update own team registration"
  ON moonshot_registrations
  FOR UPDATE
  TO authenticated
  USING (
    team_id IS NOT NULL 
    AND team_id = (auth.jwt() -> 'user_metadata' ->> 'team_id')::uuid
  )
  WITH CHECK (
    team_id IS NOT NULL 
    AND team_id = (auth.jwt() -> 'user_metadata' ->> 'team_id')::uuid
  );
