/*
  # Set Up Cron Job for Recurring Marketing Emails

  This migration creates a cron job that runs hourly to process recurring
  marketing emails that are due to be sent.

  1. Cron Job Details
    - Name: process-recurring-marketing-emails
    - Schedule: Every hour at minute 0 (0 * * * *)
    - Action: Calls the process-recurring-marketing-emails edge function

  2. How It Works
    - The cron job runs every hour
    - It calls the edge function which:
      - Finds recurring emails where next_run_at <= now()
      - Generates fresh email content using AI
      - Sends to the configured recipients
      - Updates next_run_at for the next scheduled send

  3. Notes
    - Emails are scheduled for 9:00 AM by default
    - The cron runs hourly to catch any due emails
    - Each recurring email generates fresh content each time
*/

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove existing job if it exists (to allow re-running migration)
SELECT cron.unschedule('process-recurring-marketing-emails') 
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'process-recurring-marketing-emails'
);

-- Create the cron job to run every hour
SELECT cron.schedule(
  'process-recurring-marketing-emails',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/process-recurring-marketing-emails',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);