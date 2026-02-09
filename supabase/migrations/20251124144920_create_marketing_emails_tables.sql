/*
  # Marketing Emails System

  1. New Tables
    - `marketing_emails`
      - `id` (uuid, primary key)
      - `created_by` (uuid, references users) - Super-admin who created the email
      - `subject` (text) - Email subject line
      - `content_description` (text) - User's description for AI generation
      - `special_notes` (text) - Special instructions for AI
      - `html_content` (text) - Generated/edited HTML content
      - `status` (enum) - draft, scheduled, sending, sent
      - `scheduled_for` (timestamptz) - When to send (null = immediate)
      - `sent_at` (timestamptz) - When sending completed
      - `recipient_filter` (jsonb) - Filter criteria for recipients
      - `total_recipients` (int) - Total number of recipients
      - `successful_sends` (int) - Count of successful sends
      - `failed_sends` (int) - Count of failed sends
      - `created_at`, `updated_at` (timestamptz)
    
    - `marketing_email_recipients`
      - `id` (uuid, primary key)
      - `marketing_email_id` (uuid, references marketing_emails)
      - `user_id` (uuid, references users)
      - `email` (text) - Recipient email address
      - `status` (enum) - pending, sent, failed
      - `sent_at` (timestamptz) - When email was sent
      - `email_id` (text) - Resend email ID for tracking
      - `error_message` (text) - Error details if failed
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Only super-admins can access these tables
    - Regular users have no access

  3. Indexes
    - Index on marketing_email_id for recipients table
    - Index on status for both tables
    - Index on scheduled_for for cron job queries
*/

-- Create enum types
DO $$ BEGIN
  CREATE TYPE marketing_email_status AS ENUM ('draft', 'scheduled', 'sending', 'sent');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE marketing_email_recipient_status AS ENUM ('pending', 'sent', 'failed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create marketing_emails table
CREATE TABLE IF NOT EXISTS marketing_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  subject text NOT NULL,
  content_description text NOT NULL,
  special_notes text DEFAULT '',
  html_content text DEFAULT '',
  status marketing_email_status DEFAULT 'draft',
  scheduled_for timestamptz,
  sent_at timestamptz,
  recipient_filter jsonb DEFAULT '{"type": "all"}'::jsonb,
  total_recipients int DEFAULT 0,
  successful_sends int DEFAULT 0,
  failed_sends int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create marketing_email_recipients table
CREATE TABLE IF NOT EXISTS marketing_email_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marketing_email_id uuid REFERENCES marketing_emails(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  email text NOT NULL,
  status marketing_email_recipient_status DEFAULT 'pending',
  sent_at timestamptz,
  email_id text,
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_marketing_emails_status ON marketing_emails(status);
CREATE INDEX IF NOT EXISTS idx_marketing_emails_scheduled_for ON marketing_emails(scheduled_for) WHERE scheduled_for IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_marketing_emails_created_by ON marketing_emails(created_by);
CREATE INDEX IF NOT EXISTS idx_marketing_email_recipients_campaign ON marketing_email_recipients(marketing_email_id);
CREATE INDEX IF NOT EXISTS idx_marketing_email_recipients_status ON marketing_email_recipients(status);

-- Enable RLS
ALTER TABLE marketing_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_email_recipients ENABLE ROW LEVEL SECURITY;

-- Create policies for super-admins only
CREATE POLICY "Super admins can view all marketing emails"
  ON marketing_emails
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.email IN (
        'clay@rockethub.ai',
        'derek@rockethub.ai',
        'marshall@rockethub.ai'
      )
    )
  );

CREATE POLICY "Super admins can insert marketing emails"
  ON marketing_emails
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.email IN (
        'clay@rockethub.ai',
        'derek@rockethub.ai',
        'marshall@rockethub.ai'
      )
    )
  );

CREATE POLICY "Super admins can update marketing emails"
  ON marketing_emails
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.email IN (
        'clay@rockethub.ai',
        'derek@rockethub.ai',
        'marshall@rockethub.ai'
      )
    )
  );

CREATE POLICY "Super admins can delete marketing emails"
  ON marketing_emails
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.email IN (
        'clay@rockethub.ai',
        'derek@rockethub.ai',
        'marshall@rockethub.ai'
      )
    )
  );

-- Policies for marketing_email_recipients
CREATE POLICY "Super admins can view all recipients"
  ON marketing_email_recipients
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.email IN (
        'clay@rockethub.ai',
        'derek@rockethub.ai',
        'marshall@rockethub.ai'
      )
    )
  );

CREATE POLICY "Super admins can insert recipients"
  ON marketing_email_recipients
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.email IN (
        'clay@rockethub.ai',
        'derek@rockethub.ai',
        'marshall@rockethub.ai'
      )
    )
  );

CREATE POLICY "Super admins can update recipients"
  ON marketing_email_recipients
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.email IN (
        'clay@rockethub.ai',
        'derek@rockethub.ai',
        'marshall@rockethub.ai'
      )
    )
  );

CREATE POLICY "Super admins can delete recipients"
  ON marketing_email_recipients
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.email IN (
        'clay@rockethub.ai',
        'derek@rockethub.ai',
        'marshall@rockethub.ai'
      )
    )
  );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_marketing_emails_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER marketing_emails_updated_at
  BEFORE UPDATE ON marketing_emails
  FOR EACH ROW
  EXECUTE FUNCTION update_marketing_emails_updated_at();