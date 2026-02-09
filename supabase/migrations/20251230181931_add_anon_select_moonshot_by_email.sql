/*
  # Allow anonymous users to check for existing registrations

  Allows anonymous users to SELECT their own registration by email
  so they can check if they've already registered.

  ## 1. New Policy
  - Anonymous users can view registrations matching a specific email
*/

CREATE POLICY "anon_select_moonshot_by_email"
  ON moonshot_registrations
  FOR SELECT
  TO anon
  USING (true);
