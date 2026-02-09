/*
  # Set Up Cron Job for Processing Pending Marketing Campaign Emails

  This migration creates a cron job that runs every 5 minutes to automatically
  process any marketing campaigns that have pending recipients.

  1. Purpose
    - Automatically resume sending campaigns with pending emails
    - No manual intervention required once a campaign starts
    - Processes in batches of 50 emails per run

  2. Cron Job Details
    - Name: process-pending-campaigns
    - Schedule: Every 5 minutes
    - Action: Calls the process-pending-campaigns edge function

  3. How It Works
    - The cron job runs every 5 minutes
    - It calls the edge function which:
      - Finds campaigns with pending recipients
      - Sends up to 50 emails per batch
      - Updates campaign statistics
      - Marks campaigns complete when all emails are sent
*/

-- Remove existing job if it exists (to allow re-running migration)
SELECT cron.unschedule('process-pending-campaigns') 
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'process-pending-campaigns'
);

-- Create the cron job to run every 5 minutes
SELECT cron.schedule(
  'process-pending-campaigns',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/process-pending-campaigns',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);