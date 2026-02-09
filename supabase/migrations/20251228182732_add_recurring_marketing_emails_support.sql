/*
  # Add Recurring Marketing Emails Support

  This migration adds support for recurring marketing emails that automatically
  generate fresh content and send on a schedule.

  1. New Columns on `marketing_emails`
    - `is_recurring` (boolean) - Whether this is a recurring email template
    - `frequency` (text) - How often to send: 'daily', 'weekly', 'biweekly', 'monthly'
    - `next_run_at` (timestamptz) - When the next email should be generated and sent
    - `last_run_at` (timestamptz) - When the email was last sent
    - `parent_recurring_id` (uuid) - Links sent emails back to their recurring template
    - `run_count` (int) - Number of times this recurring email has been sent

  2. New Status Value
    - Add 'recurring' to the marketing_email_status enum

  3. Indexes
    - Index on next_run_at for efficient cron queries
    - Index on parent_recurring_id for history lookups
    - Index on is_recurring for filtering

  4. Notes
    - For recurring emails, html_content stays empty (generated fresh each time)
    - The content_description, special_notes, and recipient_filter serve as the template
    - Each time a recurring email runs, it creates a new child record with the generated content
*/

-- Add 'recurring' to the status enum
ALTER TYPE marketing_email_status ADD VALUE IF NOT EXISTS 'recurring';

-- Add recurring email columns
ALTER TABLE marketing_emails 
ADD COLUMN IF NOT EXISTS is_recurring boolean DEFAULT false;

ALTER TABLE marketing_emails 
ADD COLUMN IF NOT EXISTS frequency text;

ALTER TABLE marketing_emails 
ADD COLUMN IF NOT EXISTS next_run_at timestamptz;

ALTER TABLE marketing_emails 
ADD COLUMN IF NOT EXISTS last_run_at timestamptz;

ALTER TABLE marketing_emails 
ADD COLUMN IF NOT EXISTS parent_recurring_id uuid REFERENCES marketing_emails(id) ON DELETE SET NULL;

ALTER TABLE marketing_emails 
ADD COLUMN IF NOT EXISTS run_count int DEFAULT 0;

-- Add context_type column for AI generation context
ALTER TABLE marketing_emails 
ADD COLUMN IF NOT EXISTS context_type text DEFAULT 'full';

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_marketing_emails_next_run_at 
ON marketing_emails(next_run_at) 
WHERE is_recurring = true AND next_run_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_marketing_emails_parent_recurring 
ON marketing_emails(parent_recurring_id) 
WHERE parent_recurring_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_marketing_emails_is_recurring 
ON marketing_emails(is_recurring) 
WHERE is_recurring = true;

-- Add comment explaining the columns
COMMENT ON COLUMN marketing_emails.is_recurring IS 'True if this is a recurring email template that generates fresh content on schedule';
COMMENT ON COLUMN marketing_emails.frequency IS 'Send frequency: daily, weekly, biweekly, monthly';
COMMENT ON COLUMN marketing_emails.next_run_at IS 'Next scheduled time to generate and send this recurring email';
COMMENT ON COLUMN marketing_emails.last_run_at IS 'Last time this recurring email was generated and sent';
COMMENT ON COLUMN marketing_emails.parent_recurring_id IS 'For sent emails, links back to the recurring template that generated them';
COMMENT ON COLUMN marketing_emails.run_count IS 'Number of times this recurring email has been sent';
COMMENT ON COLUMN marketing_emails.context_type IS 'AI context type: full, core, benefits, useCases';