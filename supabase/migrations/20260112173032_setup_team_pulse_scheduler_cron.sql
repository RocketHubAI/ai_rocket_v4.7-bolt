/*
  # Setup Team Pulse Scheduler Cron Job

  1. Overview
    Creates a cron job to run the process-scheduled-team-pulse function
    hourly to check for teams due for pulse generation.

  2. Cron Schedule
    - Runs every hour at minute 30 (0:30, 1:30, 2:30, etc.)
    - Calls the process-scheduled-team-pulse Edge Function
    - Only processes teams whose next_generation_at has passed

  3. Security
    - Uses service role key for authentication
    - Edge function handles team-level authorization
*/

-- Enable pg_cron if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove existing job if it exists
SELECT cron.unschedule('process-scheduled-team-pulse')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'process-scheduled-team-pulse'
);

-- Create the cron job to run hourly at minute 30
SELECT cron.schedule(
  'process-scheduled-team-pulse',
  '30 * * * *',
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