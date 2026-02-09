/*
  # Fix Cron Job URL to use correct Supabase project URL

  1. Changes
    - Remove old cron job with incorrect hardcoded URL
    - Create new cron job with correct project URL
    - The job makes an HTTP POST request to check-scheduled-reports edge function

  2. Purpose
    - Fix scheduled reports not running due to incorrect function URL
*/

-- Remove existing job
SELECT cron.unschedule('check-scheduled-reports-hourly') 
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'check-scheduled-reports-hourly'
);

-- Create the cron job with correct URL
SELECT cron.schedule(
  'check-scheduled-reports-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://poquwzvcleazbbdelcsh.supabase.co/functions/v1/check-scheduled-reports',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);