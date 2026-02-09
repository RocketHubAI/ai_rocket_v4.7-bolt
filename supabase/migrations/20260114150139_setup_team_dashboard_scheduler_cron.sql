/*
  # Setup Team Dashboard Scheduler Cron Job

  1. Overview
    Creates a cron job that runs daily at 5:00 AM UTC (midnight EST) to trigger
    the process-scheduled-team-dashboard edge function.

  2. Details
    - Cron expression: 0 5 * * * (daily at 5 AM UTC = midnight EST)
    - The edge function processes up to 20 teams per invocation
    - Each team has a 5-second delay between processing to avoid API rate limits
*/

SELECT cron.schedule(
  'process-scheduled-team-dashboard',
  '0 5 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL') || '/functions/v1/process-scheduled-team-dashboard',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 600000
  );
  $$
);