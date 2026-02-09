/*
  # Setup Overnight Assistant Cron Job

  1. Changes
    - Creates a pg_cron job that triggers the process-overnight-assistant edge function
    - Runs daily at 8:00 AM UTC (3:00 AM EST)
    - Uses the same cron invocation pattern as existing scheduled jobs

  2. Important Notes
    - The edge function processes all users with proactive_enabled = true
    - High-urgency insights (7+) are sent immediately via notification queue
    - Lower-urgency insights are packaged into an overnight summary message
    - The cron job is named 'process-overnight-assistant' for easy identification
*/

SELECT cron.unschedule('process-overnight-assistant')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'process-overnight-assistant'
);

SELECT cron.schedule(
  'process-overnight-assistant',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/process-overnight-assistant',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);