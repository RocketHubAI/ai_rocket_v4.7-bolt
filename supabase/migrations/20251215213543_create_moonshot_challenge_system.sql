/*
  # Moonshot Challenge Registration System
  
  Creates the complete database schema for the Moonshot Challenge registration
  and invite code system launching January 15, 2026.
  
  ## 1. New Tables
  
  ### moonshot_registrations
  - `id` (uuid, primary key) - Unique registration identifier
  - `name` (text) - Registrant's full name
  - `email` (text) - Registrant's email (not unique - allows re-registration)
  - `team_name` (text) - Name of their team/company
  - `industry` (text) - Industry selection
  - `created_at` (timestamptz) - Registration timestamp
  
  ### moonshot_survey_responses
  - `id` (uuid, primary key) - Response identifier
  - `registration_id` (uuid) - Links to registration
  - `current_ai_usage` (text) - How they currently use AI
  - `ai_use_cases` (text[]) - Multi-select of AI use cases
  - `monthly_ai_spend` (text) - Monthly AI budget range
  - `connected_data` (text) - What data they connect to AI
  - `biggest_pain_points` (text) - Free-text pain points
  - `created_at` (timestamptz) - Response timestamp
  
  ### moonshot_invite_codes
  - `id` (uuid, primary key) - Code record identifier
  - `registration_id` (uuid) - Links to registration
  - `code` (text, unique) - The invite code (MOON-XXXX-XXXX)
  - `valid_from` (timestamptz) - When code becomes valid (Jan 15, 2026)
  - `expires_at` (timestamptz) - When code expires (Jan 31, 2026)
  - `is_redeemed` (boolean) - Whether code has been used
  - `redeemed_at` (timestamptz) - When code was redeemed
  - `redeemed_by_user_id` (uuid) - User who redeemed the code
  - `created_at` (timestamptz) - Code creation timestamp
  
  ### moonshot_email_sequence
  - `id` (uuid, primary key) - Email record identifier
  - `registration_id` (uuid) - Links to registration
  - `email_type` (text) - Type of email (confirmation, feature_1, countdown_1, etc.)
  - `scheduled_for` (timestamptz) - When email should be sent
  - `sent_at` (timestamptz) - When email was actually sent (null if pending)
  - `created_at` (timestamptz) - Record creation timestamp
  
  ## 2. Security
  
  All tables have RLS enabled with super admin only access.
  Edge functions use service role for write operations.
  
  ## 3. Indexes
  
  - moonshot_invite_codes(code) - Fast code lookups
  - moonshot_invite_codes(registration_id) - Link lookups
  - moonshot_email_sequence(scheduled_for, sent_at) - Scheduler queries
  - moonshot_registrations(email) - Email lookups
*/

-- Create moonshot_registrations table
CREATE TABLE IF NOT EXISTS moonshot_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  team_name text NOT NULL,
  industry text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create moonshot_survey_responses table
CREATE TABLE IF NOT EXISTS moonshot_survey_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL REFERENCES moonshot_registrations(id) ON DELETE CASCADE,
  current_ai_usage text,
  ai_use_cases text[] DEFAULT '{}',
  monthly_ai_spend text,
  connected_data text,
  biggest_pain_points text,
  created_at timestamptz DEFAULT now()
);

-- Create moonshot_invite_codes table
CREATE TABLE IF NOT EXISTS moonshot_invite_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL REFERENCES moonshot_registrations(id) ON DELETE CASCADE,
  code text UNIQUE NOT NULL,
  valid_from timestamptz NOT NULL DEFAULT '2026-01-15 00:00:00+00',
  expires_at timestamptz NOT NULL DEFAULT '2026-01-31 23:59:59+00',
  is_redeemed boolean DEFAULT false,
  redeemed_at timestamptz,
  redeemed_by_user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Create moonshot_email_sequence table
CREATE TABLE IF NOT EXISTS moonshot_email_sequence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL REFERENCES moonshot_registrations(id) ON DELETE CASCADE,
  email_type text NOT NULL,
  scheduled_for timestamptz NOT NULL,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_moonshot_invite_codes_code ON moonshot_invite_codes(code);
CREATE INDEX IF NOT EXISTS idx_moonshot_invite_codes_registration ON moonshot_invite_codes(registration_id);
CREATE INDEX IF NOT EXISTS idx_moonshot_email_sequence_schedule ON moonshot_email_sequence(scheduled_for, sent_at);
CREATE INDEX IF NOT EXISTS idx_moonshot_registrations_email ON moonshot_registrations(email);

-- Enable RLS on all tables
ALTER TABLE moonshot_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE moonshot_survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE moonshot_invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE moonshot_email_sequence ENABLE ROW LEVEL SECURITY;

-- Super admin policies for moonshot_registrations
CREATE POLICY "Super admins can view all moonshot registrations"
  ON moonshot_registrations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.email IN (
        'luke@astraintelligence.io',
        'connor@astraintelligence.io',
        'clay@astraintelligence.io'
      )
    )
  );

CREATE POLICY "Super admins can insert moonshot registrations"
  ON moonshot_registrations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.email IN (
        'luke@astraintelligence.io',
        'connor@astraintelligence.io',
        'clay@astraintelligence.io'
      )
    )
  );

CREATE POLICY "Super admins can update moonshot registrations"
  ON moonshot_registrations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.email IN (
        'luke@astraintelligence.io',
        'connor@astraintelligence.io',
        'clay@astraintelligence.io'
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.email IN (
        'luke@astraintelligence.io',
        'connor@astraintelligence.io',
        'clay@astraintelligence.io'
      )
    )
  );

CREATE POLICY "Super admins can delete moonshot registrations"
  ON moonshot_registrations
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.email IN (
        'luke@astraintelligence.io',
        'connor@astraintelligence.io',
        'clay@astraintelligence.io'
      )
    )
  );

-- Super admin policies for moonshot_survey_responses
CREATE POLICY "Super admins can view all survey responses"
  ON moonshot_survey_responses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.email IN (
        'luke@astraintelligence.io',
        'connor@astraintelligence.io',
        'clay@astraintelligence.io'
      )
    )
  );

CREATE POLICY "Super admins can insert survey responses"
  ON moonshot_survey_responses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.email IN (
        'luke@astraintelligence.io',
        'connor@astraintelligence.io',
        'clay@astraintelligence.io'
      )
    )
  );

CREATE POLICY "Super admins can update survey responses"
  ON moonshot_survey_responses
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.email IN (
        'luke@astraintelligence.io',
        'connor@astraintelligence.io',
        'clay@astraintelligence.io'
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.email IN (
        'luke@astraintelligence.io',
        'connor@astraintelligence.io',
        'clay@astraintelligence.io'
      )
    )
  );

CREATE POLICY "Super admins can delete survey responses"
  ON moonshot_survey_responses
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.email IN (
        'luke@astraintelligence.io',
        'connor@astraintelligence.io',
        'clay@astraintelligence.io'
      )
    )
  );

-- Super admin policies for moonshot_invite_codes
CREATE POLICY "Super admins can view all invite codes"
  ON moonshot_invite_codes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.email IN (
        'luke@astraintelligence.io',
        'connor@astraintelligence.io',
        'clay@astraintelligence.io'
      )
    )
  );

CREATE POLICY "Super admins can insert invite codes"
  ON moonshot_invite_codes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.email IN (
        'luke@astraintelligence.io',
        'connor@astraintelligence.io',
        'clay@astraintelligence.io'
      )
    )
  );

CREATE POLICY "Super admins can update invite codes"
  ON moonshot_invite_codes
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.email IN (
        'luke@astraintelligence.io',
        'connor@astraintelligence.io',
        'clay@astraintelligence.io'
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.email IN (
        'luke@astraintelligence.io',
        'connor@astraintelligence.io',
        'clay@astraintelligence.io'
      )
    )
  );

CREATE POLICY "Super admins can delete invite codes"
  ON moonshot_invite_codes
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.email IN (
        'luke@astraintelligence.io',
        'connor@astraintelligence.io',
        'clay@astraintelligence.io'
      )
    )
  );

-- Super admin policies for moonshot_email_sequence
CREATE POLICY "Super admins can view all email sequences"
  ON moonshot_email_sequence
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.email IN (
        'luke@astraintelligence.io',
        'connor@astraintelligence.io',
        'clay@astraintelligence.io'
      )
    )
  );

CREATE POLICY "Super admins can insert email sequences"
  ON moonshot_email_sequence
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.email IN (
        'luke@astraintelligence.io',
        'connor@astraintelligence.io',
        'clay@astraintelligence.io'
      )
    )
  );

CREATE POLICY "Super admins can update email sequences"
  ON moonshot_email_sequence
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.email IN (
        'luke@astraintelligence.io',
        'connor@astraintelligence.io',
        'clay@astraintelligence.io'
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.email IN (
        'luke@astraintelligence.io',
        'connor@astraintelligence.io',
        'clay@astraintelligence.io'
      )
    )
  );

CREATE POLICY "Super admins can delete email sequences"
  ON moonshot_email_sequence
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.email IN (
        'luke@astraintelligence.io',
        'connor@astraintelligence.io',
        'clay@astraintelligence.io'
      )
    )
  );

-- Create function to validate moonshot invite code
CREATE OR REPLACE FUNCTION validate_moonshot_invite_code(invite_code text)
RETURNS TABLE (
  is_valid boolean,
  error_message text,
  registration_id uuid,
  registrant_email text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code_record moonshot_invite_codes%ROWTYPE;
  v_registration moonshot_registrations%ROWTYPE;
BEGIN
  -- Find the code
  SELECT * INTO v_code_record
  FROM moonshot_invite_codes
  WHERE moonshot_invite_codes.code = invite_code;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Invalid invite code', NULL::uuid, NULL::text;
    RETURN;
  END IF;
  
  -- Check if already redeemed
  IF v_code_record.is_redeemed THEN
    RETURN QUERY SELECT false, 'This invite code has already been used', NULL::uuid, NULL::text;
    RETURN;
  END IF;
  
  -- Check if valid_from date has passed
  IF now() < v_code_record.valid_from THEN
    RETURN QUERY SELECT false, 'This invite code is not yet valid. Please wait until January 15, 2026', NULL::uuid, NULL::text;
    RETURN;
  END IF;
  
  -- Check if expired
  IF now() > v_code_record.expires_at THEN
    RETURN QUERY SELECT false, 'This invite code has expired', NULL::uuid, NULL::text;
    RETURN;
  END IF;
  
  -- Get registration info
  SELECT * INTO v_registration
  FROM moonshot_registrations
  WHERE id = v_code_record.registration_id;
  
  -- Valid code
  RETURN QUERY SELECT true, NULL::text, v_code_record.registration_id, v_registration.email;
END;
$$;

-- Create function to redeem moonshot invite code
CREATE OR REPLACE FUNCTION redeem_moonshot_invite_code(invite_code text, user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_validation RECORD;
BEGIN
  -- Validate first
  SELECT * INTO v_validation
  FROM validate_moonshot_invite_code(invite_code);
  
  IF NOT v_validation.is_valid THEN
    RETURN false;
  END IF;
  
  -- Mark as redeemed
  UPDATE moonshot_invite_codes
  SET 
    is_redeemed = true,
    redeemed_at = now(),
    redeemed_by_user_id = user_id
  WHERE code = invite_code;
  
  RETURN true;
END;
$$;