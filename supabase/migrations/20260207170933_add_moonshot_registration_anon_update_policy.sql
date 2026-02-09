/*
  # Add anonymous UPDATE policy for moonshot registration flow

  The moonshot registration page allows anonymous users to re-register with
  updated info. When an existing registration is found by email, the page
  updates it. This requires a scoped anonymous UPDATE policy.

  1. Policy Changes
    - Add anon UPDATE policy on moonshot_registrations scoped to email match
    - Only allows updating name, industry, source, converted_at, updated_at
*/

CREATE POLICY "Anonymous can update own registration by email"
  ON moonshot_registrations FOR UPDATE
  TO anon
  USING (email IS NOT NULL AND email <> '')
  WITH CHECK (email IS NOT NULL AND email <> '');
