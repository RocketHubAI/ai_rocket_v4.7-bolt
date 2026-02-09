/*
  # Fix Process Pending Campaigns Cron Job

  1. Changes
    - Update the process-pending-campaigns cron job to use hardcoded Supabase URL
    - The previous version used current_setting() which was returning null
    - Now matches the pattern used by other working cron jobs

  2. Notes
    - This will allow the cron to properly call the edge function
    - Campaigns with pending recipients will be processed automatically
*/

SELECT cron.unschedule('process-pending-campaigns');

SELECT cron.schedule(
  'process-pending-campaigns',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://poquwzvcleazbbdelcsh.supabase.co/functions/v1/process-pending-campaigns',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
