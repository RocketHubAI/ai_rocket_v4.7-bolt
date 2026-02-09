/*
  # Create Gmail Authentication Storage

  1. New Tables
    - `gmail_auth`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `email` (text, the Gmail address)
      - `access_token` (text, encrypted access token)
      - `refresh_token` (text, encrypted refresh token)
      - `token_type` (text, usually "Bearer")
      - `expires_at` (timestamptz, when access token expires)
      - `scope` (text, granted OAuth scopes)
      - `is_active` (boolean, whether connection is active)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `gmail_auth` table
    - Users can only read/write their own Gmail auth data
    - Tokens are stored securely with proper access controls

  3. Indexes
    - Index on user_id for fast lookups
    - Unique constraint on user_id (one Gmail connection per user)
*/

-- Create the gmail_auth table
CREATE TABLE IF NOT EXISTS gmail_auth (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  access_token text NOT NULL,
  refresh_token text,
  token_type text DEFAULT 'Bearer',
  expires_at timestamptz NOT NULL,
  scope text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add unique constraint (one Gmail connection per user)
CREATE UNIQUE INDEX IF NOT EXISTS gmail_auth_user_id_key ON gmail_auth(user_id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS gmail_auth_user_id_idx ON gmail_auth(user_id);
CREATE INDEX IF NOT EXISTS gmail_auth_expires_at_idx ON gmail_auth(expires_at);

-- Enable Row Level Security
ALTER TABLE gmail_auth ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own Gmail auth data
CREATE POLICY "Users can view own Gmail auth"
  ON gmail_auth
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own Gmail auth data
CREATE POLICY "Users can insert own Gmail auth"
  ON gmail_auth
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own Gmail auth data
CREATE POLICY "Users can update own Gmail auth"
  ON gmail_auth
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own Gmail auth data
CREATE POLICY "Users can delete own Gmail auth"
  ON gmail_auth
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_gmail_auth_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_update_gmail_auth_updated_at
  BEFORE UPDATE ON gmail_auth
  FOR EACH ROW
  EXECUTE FUNCTION update_gmail_auth_updated_at();

-- Add helpful comments
COMMENT ON TABLE gmail_auth IS 'Stores Gmail OAuth tokens for workspace integration';
COMMENT ON COLUMN gmail_auth.access_token IS 'OAuth access token for Gmail API';
COMMENT ON COLUMN gmail_auth.refresh_token IS 'OAuth refresh token to get new access tokens';
COMMENT ON COLUMN gmail_auth.expires_at IS 'When the access token expires (UTC)';
