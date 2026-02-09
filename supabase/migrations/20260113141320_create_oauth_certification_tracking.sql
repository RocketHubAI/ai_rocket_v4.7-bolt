/*
  # Create OAuth Certification Tracking System

  1. New Tables
    - `oauth_app_certifications` - Track OAuth app certifications and recertification dates
      - `id` (uuid, primary key)
      - `app_name` (text) - Name of the OAuth app (e.g., 'AI Rocket Google Drive')
      - `provider` (text) - OAuth provider (e.g., 'google')
      - `client_id` (text) - The OAuth client ID (partial, for reference)
      - `project_id` (text) - Google Cloud project ID
      - `scopes` (text[]) - Approved scopes
      - `certification_date` (timestamptz) - Date certification was granted
      - `recertification_due` (timestamptz) - Date recertification is due (typically 1 year)
      - `status` (text) - Current status: 'active', 'pending_recertification', 'expired'
      - `notes` (text) - Any additional notes
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Only super admins can view/manage certifications

  3. Initial Data
    - Insert the newly approved production OAuth app certification
*/

CREATE TABLE IF NOT EXISTS oauth_app_certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_name text NOT NULL,
  provider text NOT NULL DEFAULT 'google',
  client_id_prefix text NOT NULL,
  project_id text,
  scopes text[] NOT NULL DEFAULT '{}',
  certification_date timestamptz NOT NULL,
  recertification_due timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending_recertification', 'expired', 'revoked')),
  notification_sent_30_days boolean DEFAULT false,
  notification_sent_60_days boolean DEFAULT false,
  notification_sent_90_days boolean DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(provider, client_id_prefix)
);

ALTER TABLE oauth_app_certifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view oauth certifications"
  ON oauth_app_certifications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.email IN ('clay@rockethub.ai', 'derek@rockethub.ai', 'marshall@rockethub.ai')
    )
  );

CREATE POLICY "Super admins can manage oauth certifications"
  ON oauth_app_certifications
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.email IN ('clay@rockethub.ai', 'derek@rockethub.ai', 'marshall@rockethub.ai')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.email IN ('clay@rockethub.ai', 'derek@rockethub.ai', 'marshall@rockethub.ai')
    )
  );

INSERT INTO oauth_app_certifications (
  app_name,
  provider,
  client_id_prefix,
  project_id,
  scopes,
  certification_date,
  recertification_due,
  status,
  notes
) VALUES (
  'AI Rocket - Google Drive Integration',
  'google',
  '114434248940-151m23js9v4nvb8u2kcdh6277ff41cpk',
  'new-ai-rocket-app-scopes',
  ARRAY[
    'openid',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/drive'
  ],
  '2026-01-13'::timestamptz,
  '2027-01-13'::timestamptz,
  'active',
  'Production OAuth app approved by Google. Annual recertification required. Client ID: 114434248940-151m23js9v4nvb8u2kcdh6277ff41cpk.apps.googleusercontent.com'
);

CREATE OR REPLACE FUNCTION update_oauth_certification_status()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE oauth_app_certifications
  SET 
    status = CASE
      WHEN recertification_due < NOW() THEN 'expired'
      WHEN recertification_due < NOW() + INTERVAL '30 days' THEN 'pending_recertification'
      ELSE 'active'
    END,
    updated_at = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION get_oauth_certifications_needing_attention()
RETURNS TABLE (
  id uuid,
  app_name text,
  provider text,
  recertification_due timestamptz,
  days_until_due integer,
  status text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    id,
    app_name,
    provider,
    recertification_due,
    EXTRACT(DAY FROM recertification_due - NOW())::integer as days_until_due,
    status
  FROM oauth_app_certifications
  WHERE recertification_due < NOW() + INTERVAL '90 days'
  ORDER BY recertification_due ASC;
$$;

COMMENT ON TABLE oauth_app_certifications IS 'Tracks OAuth app certifications and recertification schedules. Google requires annual recertification for apps with sensitive/restricted scopes.';