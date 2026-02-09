/*
  # Fix Google Token Auto-Refresh Cron Job Authorization
  
  ## Changes
    - Update the pg_cron job to include proper Authorization header
    - Use service role key for authentication to the edge function
    - This ensures the cron job can successfully call the edge function
  
  ## Important
    - The edge function is set to verifyJWT=true, so it needs authentication
    - Using service role key since cron runs server-side
*/

-- Remove existing job
SELECT cron.unschedule('refresh-google-tokens-every-30min') 
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'refresh-google-tokens-every-30min'
);

-- Get the service role key from environment (available in pg_cron context)
-- Create the cron job with proper authorization
SELECT cron.schedule(
  'refresh-google-tokens-every-30min',
  '*/30 * * * *',  -- Every 30 minutes
  $$
  SELECT net.http_post(
    url := 'https://poquwzvcleazbbdelcsh.supabase.co/functions/v1/refresh-google-tokens',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Store service role key in a secure setting (run this manually with actual key)
-- ALTER DATABASE postgres SET app.settings.service_role_key = 'your-service-role-key-here';

COMMENT ON EXTENSION pg_cron IS 'Automated job scheduling including Google token refresh every 30 minutes with proper authentication';
