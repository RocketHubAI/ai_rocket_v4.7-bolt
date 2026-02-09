/*
  # Fix Team Dashboard Cron Job URL Configuration

  1. Problem
    - The previous cron job used vault.decrypted_secrets which returns NULL
    - This caused the cron job to fail with "null value in column url"

  2. Solution
    - Unschedule the broken cron job
    - Recreate it using hardcoded URL (matching the working reports cron pattern)
    - The edge function handles authentication internally via service role

  3. Schedule
    - Runs daily at 5:00 AM UTC (midnight EST)
*/

-- Remove the broken cron job
SELECT cron.unschedule('process-scheduled-team-dashboard')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'process-scheduled-team-dashboard'
);

-- Recreate with hardcoded URL (matching the successful reports cron pattern)
SELECT cron.schedule(
  'process-scheduled-team-dashboard',
  '0 5 * * *',
  $$
  SELECT net.http_post(
    url := 'https://0ec90b57d6e95fcbda19832f.supabase.co/functions/v1/process-scheduled-team-dashboard',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb,
    timeout_milliseconds := 600000
  );
  $$
);
