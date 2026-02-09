/*
  # Setup Moonshot RBG Scores Daily Calculation Cron
  
  Sets up a scheduled job to calculate RBG scores daily at 6:00 AM UTC.
  This ensures standings are updated automatically throughout the challenge period.
  
  ## Schedule
  - Runs daily at 6:00 AM UTC (1:00 AM EST / 10:00 PM PST)
  - Calls the calculate-moonshot-rbg-scores edge function
*/

-- First, check and drop existing job if it exists
SELECT cron.unschedule('calculate-moonshot-rbg-scores-daily')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'calculate-moonshot-rbg-scores-daily'
);

-- Schedule the daily RBG score calculation
-- Runs at 6:00 AM UTC every day
SELECT cron.schedule(
  'calculate-moonshot-rbg-scores-daily',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/calculate-moonshot-rbg-scores',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
