/*
  # Fix Moonshot Registration - Disable RLS for Public Tables

  1. Changes
    - Disable RLS on moonshot tables since they are for public anonymous registration
    - These tables don't contain sensitive user data and are meant for public access
    
  2. Security Notes
    - moonshot_registrations: Public registration data
    - moonshot_survey_responses: Survey answers linked to registrations
    - moonshot_invite_codes: Generated invite codes
    - moonshot_email_sequence: Email scheduling
    - Super admin access is still controlled via application logic
*/

-- Disable RLS on moonshot tables for public registration
ALTER TABLE moonshot_registrations DISABLE ROW LEVEL SECURITY;
ALTER TABLE moonshot_survey_responses DISABLE ROW LEVEL SECURITY;
ALTER TABLE moonshot_invite_codes DISABLE ROW LEVEL SECURITY;
ALTER TABLE moonshot_email_sequence DISABLE ROW LEVEL SECURITY;
