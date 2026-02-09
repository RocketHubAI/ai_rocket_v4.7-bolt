/*
  # Fix Broken Cron Jobs - Replace current_setting with Hardcoded URL

  1. Changes
    - Fixes 5 cron jobs that use `current_setting('app.settings.supabase_url')` which doesn't exist
    - Replaces with hardcoded Supabase URL matching the pattern of working cron jobs
    - Affected jobs: process-overnight-assistant, process-scheduled-tasks, 
      process-scheduled-team-pulse, check-integration-health, gmail-sync-worker-job

  2. Root Cause
    - The `app.settings.supabase_url` and `app.settings.service_role_key` config parameters
      are not set in this Supabase instance
    - This caused all 5 cron jobs to fail silently every time they ran
    - The overnight assistant has never successfully delivered a morning message because of this

  3. Important Notes
    - Uses the same hardcoded URL + anon key pattern as the other working cron jobs
    - Edge functions internally create their own service_role clients using Deno env vars
    - The Authorization header with anon key is sufficient to trigger the function
*/

-- Fix process-overnight-assistant
SELECT cron.unschedule('process-overnight-assistant')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'process-overnight-assistant'
);

SELECT cron.schedule(
  'process-overnight-assistant',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://poquwzvcleazbbdelcsh.supabase.co/functions/v1/process-overnight-assistant',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer REDACTED_USE_VAULT_SECRETS"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Fix process-scheduled-tasks
SELECT cron.unschedule('process-scheduled-tasks')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'process-scheduled-tasks'
);

SELECT cron.schedule(
  'process-scheduled-tasks',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://poquwzvcleazbbdelcsh.supabase.co/functions/v1/process-scheduled-tasks',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer REDACTED_USE_VAULT_SECRETS"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Fix process-scheduled-team-pulse
SELECT cron.unschedule('process-scheduled-team-pulse')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'process-scheduled-team-pulse'
);

SELECT cron.schedule(
  'process-scheduled-team-pulse',
  '0 8 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://poquwzvcleazbbdelcsh.supabase.co/functions/v1/process-scheduled-team-pulse',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer REDACTED_USE_VAULT_SECRETS"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Fix check-integration-health
SELECT cron.unschedule('check-integration-health')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'check-integration-health'
);

SELECT cron.schedule(
  'check-integration-health',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://poquwzvcleazbbdelcsh.supabase.co/functions/v1/check-integration-health',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer REDACTED_USE_VAULT_SECRETS"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Fix gmail-sync-worker-job (had a placeholder URL)
SELECT cron.unschedule('gmail-sync-worker-job')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'gmail-sync-worker-job'
);

SELECT cron.schedule(
  'gmail-sync-worker-job',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://poquwzvcleazbbdelcsh.supabase.co/functions/v1/gmail-sync-worker',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer REDACTED_USE_VAULT_SECRETS"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
