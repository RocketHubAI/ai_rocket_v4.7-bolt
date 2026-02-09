/*
  # Setup Integration Health Check Cron

  1. Purpose
    - Schedules the check-integration-health edge function to run every 30 minutes
    - Monitors token expiration, auto-marks expired tokens, attempts refresh
    - Queues notifications for users with expiring connections

  2. Changes
    - Creates cron job `check-integration-health` running every 30 minutes

  3. Security
    - Uses service role key for authenticated function calls
*/

SELECT cron.unschedule('check-integration-health')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'check-integration-health'
);

SELECT cron.schedule(
  'check-integration-health',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/check-integration-health',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
