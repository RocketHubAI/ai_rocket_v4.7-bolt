/*
  # Update Moonshot Code Validation and Expiration

  1. Changes
    - Update validation function error message for not-yet-valid codes
    - Update default expiration from Jan 31 to April 15, 2026
    - Update existing codes' expiration to April 15, 2026
  
  2. Validation Logic
    - Codes are valid starting January 15, 2026 (valid_from)
    - Codes expire on April 15, 2026 (expires_at)
*/

-- Update the validation function with clearer error message
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
  v_code_record RECORD;
  v_registration RECORD;
BEGIN
  SELECT * INTO v_code_record
  FROM moonshot_invite_codes
  WHERE code = invite_code;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Invalid invite code', NULL::uuid, NULL::text;
    RETURN;
  END IF;
  
  IF v_code_record.is_redeemed THEN
    RETURN QUERY SELECT false, 'This invite code has already been used', NULL::uuid, NULL::text;
    RETURN;
  END IF;
  
  IF now() < v_code_record.valid_from THEN
    RETURN QUERY SELECT false, 'This invite code is not yet valid. Your Moonshot Challenge code will be valid starting January 15, 2026.', NULL::uuid, NULL::text;
    RETURN;
  END IF;
  
  IF now() > v_code_record.expires_at THEN
    RETURN QUERY SELECT false, 'This invite code has expired. The Moonshot Challenge ended on April 15, 2026.', NULL::uuid, NULL::text;
    RETURN;
  END IF;
  
  SELECT * INTO v_registration
  FROM moonshot_registrations
  WHERE id = v_code_record.registration_id;
  
  RETURN QUERY SELECT true, NULL::text, v_code_record.registration_id, v_registration.email;
END;
$$;

-- Update all existing moonshot invite codes to expire on April 15, 2026
UPDATE moonshot_invite_codes
SET expires_at = '2026-04-15 23:59:59+00'
WHERE expires_at = '2026-01-31 23:59:59+00';

-- Update the default expiration for new codes
ALTER TABLE moonshot_invite_codes 
ALTER COLUMN expires_at SET DEFAULT '2026-04-15 23:59:59+00';
