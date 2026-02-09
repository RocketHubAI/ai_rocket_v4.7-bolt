/*
  # Update Google Token Refresh to Every 10 Minutes

  ## Overview
  Updates the pg_cron job to refresh Google OAuth tokens every 10 minutes instead of 30.
  This provides more frequent refreshes to prevent token expiration issues with n8n workflows.

  ## Problem Being Solved
  - Google access tokens expire in 60 minutes
  - Previous 30-minute interval with 45-minute threshold was too close to expiration
  - Tokens could expire between cron cycles, causing n8n workflow failures
  
  ## Solution
  - Refresh every 10 minutes (6 times per hour)
  - Keep 45-minute threshold for early refresh
  - Ensures tokens are always fresh with multiple safety margins

  ## Changes
  1. Remove old 30-minute cron job
  2. Create new 10-minute cron job
  3. Same edge function, just more frequent execution

  ## Impact
  - More frequent refreshes = better reliability for n8n
  - Tokens will be refreshed 6 times per hour instead of 2
  - Minimal performance impact (lightweight HTTP call)
*/

-- Remove the old 30-minute job
SELECT cron.unschedule('refresh-google-tokens-every-30min') 
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'refresh-google-tokens-every-30min'
);

-- Create the new cron job to run every 10 minutes
SELECT cron.schedule(
  'refresh-google-tokens-every-10min',
  '*/10 * * * *',  -- Every 10 minutes
  $$
  SELECT net.http_post(
    url := 'https://poquwzvcleazbbdelcsh.supabase.co/functions/v1/refresh-google-tokens',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Update the comment
COMMENT ON EXTENSION pg_cron IS 'Automated job scheduling including Google token refresh every 10 minutes';