/*
  # Set Up Cron Job for Scheduled Tasks Processing

  1. Cron Job
    - Name: process-scheduled-tasks
    - Schedule: Every 15 minutes
    - Calls the process-scheduled-tasks edge function via HTTP POST
    - Uses service role key for authentication

  2. Important Notes
    - Runs 96 times per day (every 15 min)
    - Tasks with next_run_at within a 2-minute window are picked up
    - This ensures tasks are never more than about 15 minutes late
*/

SELECT cron.unschedule('process-scheduled-tasks')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'process-scheduled-tasks'
);

SELECT cron.schedule(
  'process-scheduled-tasks',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/process-scheduled-tasks',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);