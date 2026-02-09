/*
  # Update Team Pulse Cron to Monday 3am EST

  1. Changes
    - Updates the cron schedule from hourly to weekly on Mondays
    - Runs at 8:00 UTC (3:00 AM EST / 4:00 AM EDT)
    - Ensures consistent Monday morning Team Pulse generation

  2. Schedule
    - Cron expression: 0 8 * * 1
    - Minute: 0
    - Hour: 8 (UTC) = 3 AM EST
    - Day of month: * (any)
    - Month: * (any)
    - Day of week: 1 (Monday)

  3. Notes
    - During EDT (daylight saving), this will be 4 AM local time
    - Teams get their weekly pulse report ready for Monday morning
*/

-- Remove existing job if it exists
SELECT cron.unschedule('process-scheduled-team-pulse')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'process-scheduled-team-pulse'
);

-- Create the cron job to run every Monday at 8:00 AM UTC (3:00 AM EST)
SELECT cron.schedule(
  'process-scheduled-team-pulse',
  '0 8 * * 1',
  $$
  SELECT
    net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/process-scheduled-team-pulse',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);