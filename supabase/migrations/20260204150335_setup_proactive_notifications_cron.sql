/*
  # Setup Proactive Notifications Cron Job

  This migration sets up a scheduled cron job to process the proactive notification queue.

  1. Cron Schedule
    - Runs every 15 minutes to check for pending notifications
    - Processes notifications that are due based on scheduled_for time
    - Respects user quiet hours and preferences

  2. Function Called
    - process-proactive-notifications edge function
    - Handles message generation and multi-channel dispatch
*/

-- Schedule the proactive notifications processor to run every 15 minutes
SELECT cron.schedule(
  'process-proactive-notifications',
  '*/15 * * * *',
  $$
  SELECT
    net.http_post(
      url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL') || '/functions/v1/process-proactive-notifications',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY')
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);