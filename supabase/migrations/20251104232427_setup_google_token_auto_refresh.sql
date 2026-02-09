/*
  # Setup Automatic Google Token Refresh (Gmail + Drive)

  ## Overview
  This migration creates a pg_cron job that automatically refreshes Google OAuth tokens
  (both Gmail and Google Drive) every 30 minutes to ensure n8n workflows always have
  valid access tokens, even when users are not actively using the application.

  ## 1. Purpose
    - Proactively refresh tokens before they expire (45-minute threshold)
    - Ensures n8n workflows never fail due to expired tokens
    - Maintains seamless integration with Google services

  ## 2. Implementation
    - Uses pg_cron to schedule automatic execution
    - Runs every 30 minutes
    - Calls the refresh-google-tokens edge function via pg_net
    - Edge function handles both Gmail and Drive token refresh

  ## 3. How It Works
    - Cron job triggers every 30 minutes
    - Edge function queries for tokens expiring in next 45 minutes
    - Refreshes tokens using refresh_token
    - Updates database with new access_token and expiry
    - Marks connections as inactive if refresh fails

  ## 4. Tables Affected
    - gmail_auth (automatic token refresh)
    - user_drive_connections (automatic token refresh)

  ## 5. Important Notes
    - This ensures n8n can always access fresh tokens from the database
    - No need to call refresh endpoints from n8n workflows
    - Tokens are kept fresh in the background automatically
*/

-- Remove existing job if it exists (in case we're updating)
SELECT cron.unschedule('refresh-google-tokens-every-30min') 
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'refresh-google-tokens-every-30min'
);

-- Create the cron job to run every 30 minutes
SELECT cron.schedule(
  'refresh-google-tokens-every-30min',
  '*/30 * * * *',  -- Every 30 minutes
  $$
  SELECT net.http_post(
    url := 'https://poquwzvcleazbbdelcsh.supabase.co/functions/v1/refresh-google-tokens',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Add helpful comment
COMMENT ON EXTENSION pg_cron IS 'Automated job scheduling including Google token refresh every 30 minutes';
