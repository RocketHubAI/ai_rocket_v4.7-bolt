/*
  # Update off-peak report processing crons to start at 2 AM EST

  1. Changes
    - Remove old cron jobs (3am, 4am, 5am)
    - Add new cron job starting at 2 AM EST (7 AM UTC)
    - Pre-generate reports for the next 7 hours (covering 2am-9am EST delivery window)
    - Reports are staggered with 15-second intervals in the edge function

  2. Notes
    - 2 AM EST = 7 AM UTC (or 6 AM UTC during EDT)
    - Using 7 AM UTC to be safe (covers both EST and EDT scenarios)
    - Single cron job with larger window replaces multiple jobs
*/

SELECT cron.unschedule('pregenerate-reports-offpeak-3am');
SELECT cron.unschedule('pregenerate-reports-offpeak-4am');
SELECT cron.unschedule('pregenerate-reports-offpeak-5am');

SELECT cron.schedule(
  'pregenerate-reports-offpeak-2am',
  '0 7 * * *',
  $$
  SELECT net.http_post(
    url := 'https://poquwzvcleazbbdelcsh.supabase.co/functions/v1/check-scheduled-reports',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{"pregenerate": true, "hoursAhead": 7}'::jsonb
  );
  $$
);
