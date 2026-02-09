/*
  # Fix Moonshot Registration - Allow Anonymous Inserts

  1. Changes
    - Add INSERT policies for anonymous users on moonshot tables
    - This allows public registration without authentication
    
  2. Security
    - Only INSERT is allowed for anonymous users
    - SELECT, UPDATE, DELETE remain restricted to super admins
*/

-- Allow anonymous users to insert registrations
CREATE POLICY "Anyone can register for moonshot"
  ON moonshot_registrations
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow anonymous users to insert survey responses  
CREATE POLICY "Anyone can submit survey responses"
  ON moonshot_survey_responses
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow anonymous users to have invite codes created
CREATE POLICY "Anyone can receive invite codes"
  ON moonshot_invite_codes
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow anonymous users to be added to email sequence
CREATE POLICY "Anyone can be added to email sequence"
  ON moonshot_email_sequence
  FOR INSERT
  TO anon
  WITH CHECK (true);
