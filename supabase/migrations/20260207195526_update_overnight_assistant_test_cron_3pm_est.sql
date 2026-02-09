/*
  # Update Overnight Assistant Test Cron to 3pm EST

  1. Changes
    - Removes the 2pm EST (19:00 UTC) test cron
    - Adds a 3pm EST (20:00 UTC) test cron instead
    - This is for testing the redesigned data-driven overnight assistant

  2. Important Notes
    - Temporary test schedule - can be removed once verified
    - The original 3am EST production schedule remains active
*/

SELECT cron.unschedule('process-overnight-assistant-test-2pm');

SELECT cron.schedule(
  'process-overnight-assistant-test-3pm',
  '0 20 * * *',
  $$
  SELECT net.http_post(
    url := 'https://poquwzvcleazbbdelcsh.supabase.co/functions/v1/process-overnight-assistant',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer REDACTED_USE_VAULT_SECRETS"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
