/*
  # Add 2pm EST Test Cron for Overnight Assistant

  1. Changes
    - Adds a second cron schedule for the overnight assistant at 2pm EST (19:00 UTC)
    - This is for testing purposes to verify the overnight analysis flow during daytime hours
    - The original 3am EST (8:00 UTC) schedule remains active

  2. Important Notes
    - This is a temporary test schedule
    - Can be removed once the overnight flow is verified working
*/

SELECT cron.schedule(
  'process-overnight-assistant-test-2pm',
  '0 19 * * *',
  $$
  SELECT net.http_post(
    url := 'https://poquwzvcleazbbdelcsh.supabase.co/functions/v1/process-overnight-assistant',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer REDACTED_USE_VAULT_SECRETS"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
