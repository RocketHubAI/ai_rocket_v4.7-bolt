/*
  # Fix Moonshot RLS Policies - Add RocketHub Emails

  1. Changes
    - Update super admin SELECT policies on moonshot tables to include rockethub.ai emails
    - Tables affected: moonshot_registrations, moonshot_survey_responses, moonshot_invite_codes, moonshot_email_sequence

  2. Security
    - Adds clay@rockethub.ai to super admin access for moonshot tables
*/

-- Drop and recreate moonshot_registrations SELECT policy
DROP POLICY IF EXISTS "Super admins can view all moonshot registrations" ON moonshot_registrations;
CREATE POLICY "Super admins can view all moonshot registrations"
  ON moonshot_registrations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.email IN (
        'luke@astraintelligence.io',
        'connor@astraintelligence.io',
        'clay@astraintelligence.io',
        'clay@rockethub.ai'
      )
    )
  );

-- Drop and recreate moonshot_survey_responses SELECT policy
DROP POLICY IF EXISTS "Super admins can view all survey responses" ON moonshot_survey_responses;
CREATE POLICY "Super admins can view all survey responses"
  ON moonshot_survey_responses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.email IN (
        'luke@astraintelligence.io',
        'connor@astraintelligence.io',
        'clay@astraintelligence.io',
        'clay@rockethub.ai'
      )
    )
  );

-- Drop and recreate moonshot_invite_codes SELECT policy
DROP POLICY IF EXISTS "Super admins can view all invite codes" ON moonshot_invite_codes;
CREATE POLICY "Super admins can view all invite codes"
  ON moonshot_invite_codes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.email IN (
        'luke@astraintelligence.io',
        'connor@astraintelligence.io',
        'clay@astraintelligence.io',
        'clay@rockethub.ai'
      )
    )
  );

-- Drop and recreate moonshot_email_sequence SELECT policy
DROP POLICY IF EXISTS "Super admins can view all email sequences" ON moonshot_email_sequence;
CREATE POLICY "Super admins can view all email sequences"
  ON moonshot_email_sequence FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.email IN (
        'luke@astraintelligence.io',
        'connor@astraintelligence.io',
        'clay@astraintelligence.io',
        'clay@rockethub.ai'
      )
    )
  );
