/*
  # Create invite_codes table

  1. New Tables
    - `invite_codes`
      - `id` (uuid, primary key) - Unique identifier for the invite code
      - `code` (text, unique) - The actual invite code string
      - `created_by` (uuid) - Reference to auth.users who created this code
      - `max_uses` (integer) - Maximum number of times this code can be used
      - `current_uses` (integer) - Number of times this code has been used
      - `is_active` (boolean) - Whether this code is currently active
      - `created_at` (timestamptz) - When the code was created
      - `expires_at` (timestamptz, nullable) - Optional expiration date

  2. Security
    - Enable RLS on `invite_codes` table
    - Add policy for super-admins (clay@rockethub.ai) to manage all codes
    - Add policy for authenticated users to read active codes (for validation)

  3. Indexes
    - Add index on `code` for fast lookups
    - Add index on `created_by` for admin queries
*/

-- Create invite_codes table
CREATE TABLE IF NOT EXISTS invite_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  max_uses integer NOT NULL DEFAULT 1,
  current_uses integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  CONSTRAINT valid_uses CHECK (current_uses >= 0 AND current_uses <= max_uses)
);

-- Enable RLS
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;

-- Policy: Super-admins can view all invite codes (using auth.jwt())
CREATE POLICY "Super-admins can view all invite codes"
  ON invite_codes
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt()->>'email')::text = 'clay@rockethub.ai'
  );

-- Policy: Super-admins can insert invite codes
CREATE POLICY "Super-admins can create invite codes"
  ON invite_codes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt()->>'email')::text = 'clay@rockethub.ai'
  );

-- Policy: Super-admins can update invite codes
CREATE POLICY "Super-admins can update invite codes"
  ON invite_codes
  FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt()->>'email')::text = 'clay@rockethub.ai'
  )
  WITH CHECK (
    (auth.jwt()->>'email')::text = 'clay@rockethub.ai'
  );

-- Policy: Super-admins can delete invite codes
CREATE POLICY "Super-admins can delete invite codes"
  ON invite_codes
  FOR DELETE
  TO authenticated
  USING (
    (auth.jwt()->>'email')::text = 'clay@rockethub.ai'
  );

-- Policy: Anyone (including anon) can read active invite codes for validation
CREATE POLICY "Anyone can validate invite codes"
  ON invite_codes
  FOR SELECT
  TO anon
  USING (
    is_active = true
    AND (expires_at IS NULL OR expires_at > now())
    AND current_uses < max_uses
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON invite_codes(code);
CREATE INDEX IF NOT EXISTS idx_invite_codes_created_by ON invite_codes(created_by);
CREATE INDEX IF NOT EXISTS idx_invite_codes_active ON invite_codes(is_active) WHERE is_active = true;
