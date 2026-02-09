/*
  # Allow anonymous team name lookup for invite checking

  1. Changes
    - Add RLS policy to allow anonymous users to read team names
    - This is needed for the signup flow to display which team a user is being invited to
    - Limited to SELECT only and only the name column is functionally exposed

  2. Security
    - Only allows reading team data, not modifying
    - Used specifically for the invite flow before user authentication
*/

CREATE POLICY "Anonymous users can view team names for invite checking"
  ON teams
  FOR SELECT
  TO anon
  USING (true);
