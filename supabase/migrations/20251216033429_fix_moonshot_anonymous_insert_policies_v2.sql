/*
  # Fix Moonshot Registration Anonymous Policies V2

  1. Changes
    - Drop and recreate anonymous INSERT policies with explicit syntax
    - Ensure policies properly allow anonymous users to insert
    
  2. Security
    - Only INSERT is allowed for anonymous users
    - Uses explicit TO anon and WITH CHECK (true)
*/

-- Drop existing anonymous policies
DROP POLICY IF EXISTS "Anyone can register for moonshot" ON moonshot_registrations;
DROP POLICY IF EXISTS "Anyone can submit survey responses" ON moonshot_survey_responses;
DROP POLICY IF EXISTS "Anyone can receive invite codes" ON moonshot_invite_codes;
DROP POLICY IF EXISTS "Anyone can be added to email sequence" ON moonshot_email_sequence;

-- Recreate with explicit syntax for anonymous inserts
CREATE POLICY "anon_insert_moonshot_registrations"
  ON moonshot_registrations
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "anon_insert_moonshot_survey_responses"
  ON moonshot_survey_responses
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "anon_insert_moonshot_invite_codes"
  ON moonshot_invite_codes
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "anon_insert_moonshot_email_sequence"
  ON moonshot_email_sequence
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Also grant usage on sequences if needed
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;
