/*
  # Add Microsoft Tenant Consent Tracking

  1. New Tables
    - `microsoft_tenant_consent`
      - `tenant_id` (text, primary key) - Microsoft tenant ID
      - `team_id` (uuid) - RocketHub team that triggered the approval
      - `granted_at` (timestamp) - When admin approval was granted
      - `granted_by_email` (text) - Admin email that granted approval
      - `is_active` (boolean) - Whether the consent is still valid
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on the table
    - Allow anyone to read tenant consent records (to check before OAuth)
    - Allow service role to write records (from edge function)

  3. Purpose
    - Track which Microsoft tenants have already granted admin consent
    - Prevent users from seeing "Need admin approval" screen when it's already approved
*/

CREATE TABLE IF NOT EXISTS microsoft_tenant_consent (
  tenant_id text PRIMARY KEY,
  team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  granted_by_email text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_microsoft_tenant_consent_team_id ON microsoft_tenant_consent(team_id);
CREATE INDEX IF NOT EXISTS idx_microsoft_tenant_consent_is_active ON microsoft_tenant_consent(is_active);

ALTER TABLE microsoft_tenant_consent ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tenant consent to check before OAuth"
  ON microsoft_tenant_consent FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage tenant consent"
  ON microsoft_tenant_consent FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);
