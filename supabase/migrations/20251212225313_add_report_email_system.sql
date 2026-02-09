/*
  # Add Report Email System

  1. New Columns
    - `users.receive_report_emails` (boolean, default FALSE for testing)
      - Only users with this set to TRUE will receive report emails
      - Initially only clay@rockethub.ai will have this enabled
    - `astra_reports.send_email` (boolean, default TRUE)
      - Per-report toggle to enable/disable email notifications

  2. New Tables
    - `report_email_deliveries` - Tracks email delivery attempts for reports
      - Links report to chat message to user
      - Tracks status: 'pending', 'sent', 'failed', 'retry_failed'
      - Tracks retry attempts

  3. Security
    - Enable RLS on report_email_deliveries
    - Users can view their own delivery records
    - Service role can insert/update all records

  4. Initial Data
    - Enable report emails for clay@rockethub.ai
*/

-- Add receive_report_emails to users table (default FALSE for test mode)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'receive_report_emails'
  ) THEN
    ALTER TABLE users ADD COLUMN receive_report_emails boolean DEFAULT false;
  END IF;
END $$;

-- Add send_email to astra_reports table (default TRUE)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'astra_reports' AND column_name = 'send_email'
  ) THEN
    ALTER TABLE astra_reports ADD COLUMN send_email boolean DEFAULT true;
  END IF;
END $$;

-- Create report_email_deliveries table
CREATE TABLE IF NOT EXISTS report_email_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid REFERENCES astra_reports(id) ON DELETE CASCADE,
  chat_message_id uuid REFERENCES astra_chats(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  email text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  retry_count integer DEFAULT 0,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT valid_status CHECK (status IN ('pending', 'sent', 'failed', 'retry_failed'))
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_report_email_deliveries_user_id ON report_email_deliveries(user_id);
CREATE INDEX IF NOT EXISTS idx_report_email_deliveries_report_id ON report_email_deliveries(report_id);
CREATE INDEX IF NOT EXISTS idx_report_email_deliveries_status ON report_email_deliveries(status);

-- Enable RLS
ALTER TABLE report_email_deliveries ENABLE ROW LEVEL SECURITY;

-- Users can view their own delivery records
CREATE POLICY "Users can view own report email deliveries"
  ON report_email_deliveries
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Enable report emails ONLY for clay@rockethub.ai initially (test mode)
UPDATE users 
SET receive_report_emails = true 
WHERE email = 'clay@rockethub.ai';

-- Add comment explaining test mode
COMMENT ON COLUMN users.receive_report_emails IS 'When true, user receives email notifications when reports run. Initially only enabled for test users.';
COMMENT ON COLUMN astra_reports.send_email IS 'When true, email notifications are sent when this report runs.';
