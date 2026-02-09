/*
  # Fix Team Settings Permissions for Onboarding

  1. Changes
    - Update RLS policies to allow team members to upsert their own team settings
    - This enables users to configure team settings during onboarding even if they're not admin yet
    - Still requires users to be part of the team (team_id must match)
  
  2. Security
    - Users can only modify settings for their own team
    - Cannot access or modify other teams' settings
    - Admin-only restriction removed for INSERT to allow onboarding flow
*/

-- Drop existing restrictive INSERT policy
DROP POLICY IF EXISTS "Team admins can insert team settings" ON team_settings;

-- Create new policy that allows any team member to insert settings for their team
CREATE POLICY "Team members can insert their team settings"
  ON team_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.team_id = team_settings.team_id
    )
  );

-- Drop existing restrictive UPDATE policy  
DROP POLICY IF EXISTS "Team admins can update team settings" ON team_settings;

-- Create new policy that allows any team member to update settings for their team
CREATE POLICY "Team members can update their team settings"
  ON team_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.team_id = team_settings.team_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.team_id = team_settings.team_id
    )
  );
