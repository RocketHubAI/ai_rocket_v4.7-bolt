/*
  # Create Marketing Contacts Table

  1. New Tables
    - `marketing_contacts` - External contacts for marketing emails
      - `id` (uuid, primary key)
      - `record_id` (text) - Original HubSpot record ID
      - `first_name` (text)
      - `last_name` (text)
      - `email` (text, unique, not null)
      - `phone_number` (text)
      - `contact_owner` (text)
      - `lead_status` (text)
      - `gobundance_member` (text)
      - `unsubscribed` (boolean, default false)
      - `unsubscribe_token` (uuid) - Unique token for unsubscribe links
      - `unsubscribed_at` (timestamptz)
      - `source` (text) - Where the contact came from
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Functions
    - `get_marketing_contacts_for_campaign` - Returns contacts excluding those in users/preview_requests

  3. Security
    - Enable RLS
    - Super admin can read/write all
*/

CREATE TABLE IF NOT EXISTS marketing_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id text,
  first_name text,
  last_name text,
  email text UNIQUE NOT NULL,
  phone_number text,
  contact_owner text,
  lead_status text,
  gobundance_member text,
  unsubscribed boolean DEFAULT false,
  unsubscribe_token uuid DEFAULT gen_random_uuid(),
  unsubscribed_at timestamptz,
  source text DEFAULT 'hubspot_import',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketing_contacts_email ON marketing_contacts(email);
CREATE INDEX IF NOT EXISTS idx_marketing_contacts_unsubscribed ON marketing_contacts(unsubscribed);
CREATE INDEX IF NOT EXISTS idx_marketing_contacts_unsubscribe_token ON marketing_contacts(unsubscribe_token);

ALTER TABLE marketing_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can read marketing_contacts"
  ON marketing_contacts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.email IN (
        'clay@rockethub.ai',
        'clay@healthrocket.app',
        'joseph@healthrocket.life',
        'chuck@healthrocket.life',
        'derek@healthrocket.life'
      )
    )
  );

CREATE POLICY "Super admins can insert marketing_contacts"
  ON marketing_contacts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.email IN (
        'clay@rockethub.ai',
        'clay@healthrocket.app',
        'joseph@healthrocket.life',
        'chuck@healthrocket.life',
        'derek@healthrocket.life'
      )
    )
  );

CREATE POLICY "Super admins can update marketing_contacts"
  ON marketing_contacts
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.email IN (
        'clay@rockethub.ai',
        'clay@healthrocket.app',
        'joseph@healthrocket.life',
        'chuck@healthrocket.life',
        'derek@healthrocket.life'
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.email IN (
        'clay@rockethub.ai',
        'clay@healthrocket.app',
        'joseph@healthrocket.life',
        'chuck@healthrocket.life',
        'derek@healthrocket.life'
      )
    )
  );

CREATE POLICY "Super admins can delete marketing_contacts"
  ON marketing_contacts
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.email IN (
        'clay@rockethub.ai',
        'clay@healthrocket.app',
        'joseph@healthrocket.life',
        'chuck@healthrocket.life',
        'derek@healthrocket.life'
      )
    )
  );

CREATE OR REPLACE FUNCTION get_marketing_contacts_for_campaign()
RETURNS TABLE (
  id uuid,
  email text,
  first_name text,
  last_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mc.id,
    mc.email,
    mc.first_name,
    mc.last_name
  FROM marketing_contacts mc
  WHERE mc.unsubscribed = false
    AND mc.email NOT IN (SELECT u.email FROM users u WHERE u.email IS NOT NULL)
    AND mc.email NOT IN (SELECT pr.email FROM preview_requests pr WHERE pr.email IS NOT NULL);
END;
$$;