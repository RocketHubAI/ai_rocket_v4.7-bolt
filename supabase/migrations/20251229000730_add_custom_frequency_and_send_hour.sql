/*
  # Add Custom Frequency and Send Hour for Recurring Emails

  1. New Columns
    - `custom_interval_days` (integer) - Custom number of days between sends (for 'custom' frequency)
    - `send_hour` (integer) - Hour of day to send (0-23), defaults to 9

  2. Changes
    - Allows users to specify custom intervals (e.g., every 3 days, every 10 days)
    - Allows users to choose what time of day to send recurring emails
    - Updates frequency column to accept 'custom' as a value

  3. Notes
    - send_hour defaults to 9 (9:00 AM) for backwards compatibility
    - custom_interval_days only used when frequency = 'custom'
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'marketing_emails' AND column_name = 'custom_interval_days'
  ) THEN
    ALTER TABLE marketing_emails ADD COLUMN custom_interval_days integer DEFAULT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'marketing_emails' AND column_name = 'send_hour'
  ) THEN
    ALTER TABLE marketing_emails ADD COLUMN send_hour integer DEFAULT 9;
  END IF;
END $$;

COMMENT ON COLUMN marketing_emails.custom_interval_days IS 'Number of days between sends when frequency is custom';
COMMENT ON COLUMN marketing_emails.send_hour IS 'Hour of day (0-23) to send recurring emails, defaults to 9 (9 AM)';
