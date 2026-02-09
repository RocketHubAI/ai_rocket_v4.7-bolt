/*
  # Admin User Invites System

  1. New Tables
    - `admin_invites`
      - `id` (uuid, primary key)
      - `email` (text, unique) - Email address of invited user
      - `invited_by` (uuid, foreign key) - Admin user who created invite
      - `status` (text) - pending, accepted, expired
      - `expires_at` (timestamptz) - Expiration date (7 days from creation)
      - `created_at` (timestamptz)
      - `accepted_at` (timestamptz, nullable)

  2. Security
    - Enable RLS on `admin_invites` table
    - Admin users (clay@rockethub.ai) can create and view invites
    - All authenticated users can check if their email has a pending invite

  3. Notes
    - Invites expire after 7 days
    - Once accepted, invite status changes to 'accepted'
    - System checks for pending invite during signup/login
*/

CREATE TABLE IF NOT EXISTS admin_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  invited_by uuid REFERENCES auth.users(id) NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz DEFAULT now(),
  accepted_at timestamptz
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_invites_email ON admin_invites(email) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_admin_invites_status ON admin_invites(status);

-- Enable RLS
ALTER TABLE admin_invites ENABLE ROW LEVEL SECURITY;

-- Admin users can insert invites (only clay@rockethub.ai)
CREATE POLICY "Admin can create invites"
  ON admin_invites
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'clay@rockethub.ai'
    )
  );

-- Admin users can view all invites
CREATE POLICY "Admin can view invites"
  ON admin_invites
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'clay@rockethub.ai'
    )
  );

-- Admin users can update invites (mark as expired, etc.)
CREATE POLICY "Admin can update invites"
  ON admin_invites
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'clay@rockethub.ai'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'clay@rockethub.ai'
    )
  );

-- Any authenticated user can check if their email has a pending invite
CREATE POLICY "Users can check own invite status"
  ON admin_invites
  FOR SELECT
  TO authenticated
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND status = 'pending'
    AND expires_at > now()
  );

-- Function to automatically expire old invites
CREATE OR REPLACE FUNCTION expire_old_invites()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE admin_invites
  SET status = 'expired'
  WHERE status = 'pending'
  AND expires_at < now();
END;
$$;
