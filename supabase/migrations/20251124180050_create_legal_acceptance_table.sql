/*
  # Create Legal Acceptance Tracking Table

  1. New Tables
    - `legal_acceptance`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `document_type` (text) - 'privacy_policy' or 'terms_of_service'
      - `version` (text) - version date of the document (e.g., '2025-11-24')
      - `accepted_at` (timestamptz) - when user accepted
      - `ip_address` (text) - IP address at time of acceptance
      - `user_agent` (text) - browser user agent
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `legal_acceptance` table
    - Users can view their own acceptance records
    - Only service role can insert records (during signup)
    - Super admins can view all records for compliance purposes

  3. Indexes
    - Index on user_id for fast lookups
    - Composite index on (user_id, document_type) for checking acceptance status
*/

-- Create legal acceptance table
CREATE TABLE IF NOT EXISTS legal_acceptance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  document_type text NOT NULL CHECK (document_type IN ('privacy_policy', 'terms_of_service')),
  version text NOT NULL,
  accepted_at timestamptz DEFAULT now() NOT NULL,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_legal_acceptance_user_id ON legal_acceptance(user_id);
CREATE INDEX IF NOT EXISTS idx_legal_acceptance_user_document ON legal_acceptance(user_id, document_type);
CREATE INDEX IF NOT EXISTS idx_legal_acceptance_created_at ON legal_acceptance(created_at DESC);

-- Enable RLS
ALTER TABLE legal_acceptance ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own acceptance records
CREATE POLICY "Users can view own legal acceptance records"
  ON legal_acceptance
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Super admins can view all records for compliance
CREATE POLICY "Super admins can view all legal acceptance records"
  ON legal_acceptance
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.email IN (
        'clay@getproductize.com',
        'productizewithclay@gmail.com',
        'joel.stumpf@gmail.com'
      )
    )
  );

-- Policy: Allow inserts during signup (authenticated users can record their own acceptance)
CREATE POLICY "Users can record their own legal acceptance"
  ON legal_acceptance
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Add comment for documentation
COMMENT ON TABLE legal_acceptance IS 'Tracks user acceptance of legal documents for liability protection and compliance';
COMMENT ON COLUMN legal_acceptance.document_type IS 'Type of legal document: privacy_policy or terms_of_service';
COMMENT ON COLUMN legal_acceptance.version IS 'Version date of the document (YYYY-MM-DD format)';
COMMENT ON COLUMN legal_acceptance.ip_address IS 'IP address at time of acceptance for audit trail';
COMMENT ON COLUMN legal_acceptance.user_agent IS 'Browser user agent for audit trail';