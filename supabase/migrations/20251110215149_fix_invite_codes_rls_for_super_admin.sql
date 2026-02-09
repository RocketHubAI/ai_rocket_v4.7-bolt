/*
  # Fix Invite Codes RLS Policies for Super Admin

  ## Overview
  Fix RLS policies for invite_codes table to properly check super admin email.
  The previous implementation using auth.jwt()->>'email' may not work reliably.

  ## Changes
  1. Drop existing super-admin policies
  2. Recreate policies using auth.email() function which is more reliable
  3. Ensure clay@rockethub.ai can manage all invite codes

  ## Security
  - Only clay@rockethub.ai can create, read, update, and delete invite codes
  - Anonymous users can still read active codes for validation during signup
*/

-- Drop existing super-admin policies
DROP POLICY IF EXISTS "Super-admins can view all invite codes" ON invite_codes;
DROP POLICY IF EXISTS "Super-admins can create invite codes" ON invite_codes;
DROP POLICY IF EXISTS "Super-admins can update invite codes" ON invite_codes;
DROP POLICY IF EXISTS "Super-admins can delete invite codes" ON invite_codes;

-- Policy: Super-admins can view all invite codes (using auth.email())
CREATE POLICY "Super-admins can view all invite codes"
  ON invite_codes
  FOR SELECT
  TO authenticated
  USING (
    auth.email() = 'clay@rockethub.ai'
  );

-- Policy: Super-admins can insert invite codes
CREATE POLICY "Super-admins can create invite codes"
  ON invite_codes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.email() = 'clay@rockethub.ai'
  );

-- Policy: Super-admins can update invite codes
CREATE POLICY "Super-admins can update invite codes"
  ON invite_codes
  FOR UPDATE
  TO authenticated
  USING (
    auth.email() = 'clay@rockethub.ai'
  )
  WITH CHECK (
    auth.email() = 'clay@rockethub.ai'
  );

-- Policy: Super-admins can delete invite codes
CREATE POLICY "Super-admins can delete invite codes"
  ON invite_codes
  FOR DELETE
  TO authenticated
  USING (
    auth.email() = 'clay@rockethub.ai'
  );
