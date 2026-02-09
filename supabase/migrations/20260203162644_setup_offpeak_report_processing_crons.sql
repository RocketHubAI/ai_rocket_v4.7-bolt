/*
  # Set up off-peak report processing cron jobs

  1. New Cron Jobs
    - `deliver-pending-reports-hourly`: Runs every hour to deliver pre-generated reports
    - `pregenerate-reports-offpeak`: Runs at 3 AM, 4 AM, 5 AM EST to pre-generate morning reports

  2. How it works
    - At off-peak hours (3-5 AM EST / 8-10 AM UTC), reports scheduled for the next 6 hours are pre-generated
    - Pre-generated reports have deliver_at set to their scheduled delivery time
    - The delivery cron runs hourly and sends emails for reports where deliver_at <= now()
*/

SELECT cron.schedule(
  'deliver-pending-reports-hourly',
  '5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://poquwzvcleazbbdelcsh.supabase.co/functions/v1/deliver-pending-reports',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'pregenerate-reports-offpeak-3am',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://poquwzvcleazbbdelcsh.supabase.co/functions/v1/check-scheduled-reports',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{"pregenerate": true, "hoursAhead": 6}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'pregenerate-reports-offpeak-4am',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := 'https://poquwzvcleazbbdelcsh.supabase.co/functions/v1/check-scheduled-reports',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{"pregenerate": true, "hoursAhead": 5}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'pregenerate-reports-offpeak-5am',
  '0 10 * * *',
  $$
  SELECT net.http_post(
    url := 'https://poquwzvcleazbbdelcsh.supabase.co/functions/v1/check-scheduled-reports',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{"pregenerate": true, "hoursAhead": 4}'::jsonb
  );
  $$
);
