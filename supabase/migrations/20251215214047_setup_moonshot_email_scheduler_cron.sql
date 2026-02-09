/*
  # Setup Moonshot Email Scheduler Cron Job
  
  Creates a scheduled cron job to process the moonshot email sequence.
  
  ## Details
  - Runs every hour to check for pending emails
  - Calls the moonshot-email-scheduler edge function
  - Uses the supabase_functions schema for cron jobs
*/

-- Enable pg_cron if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove existing job if it exists
SELECT cron.unschedule('moonshot-email-scheduler')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'moonshot-email-scheduler'
);

-- Schedule the moonshot email scheduler to run every hour
SELECT cron.schedule(
  'moonshot-email-scheduler',
  '0 * * * *',
  $$
  SELECT
    net.http_post(
      url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url') || '/functions/v1/moonshot-email-scheduler',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);