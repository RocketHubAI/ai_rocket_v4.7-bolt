-- Migration: Migrate all cron jobs from hardcoded tokens to Supabase Vault secrets
-- Date: 2026-02-09
--
-- This migration updates all pg_cron jobs to use vault.decrypted_secrets
-- instead of hardcoded JWT tokens for authentication.
--
-- PREREQUISITES:
-- The following secrets must be stored in the Supabase Vault:
--   - SUPABASE_URL: The project URL (e.g., https://PROJECT_REF.supabase.co)
--   - SUPABASE_SERVICE_ROLE_KEY: The service_role JWT key
--
-- To store secrets in the vault, run:
--   SELECT vault.create_secret('https://YOUR_PROJECT_REF.supabase.co', 'SUPABASE_URL');
--   SELECT vault.create_secret('YOUR_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_ROLE_KEY');

-- 1. calculate-moonshot-rbg-scores-daily (daily at 6:00 UTC / 1:00 AM EST)
SELECT cron.unschedule('calculate-moonshot-rbg-scores-daily');
SELECT cron.schedule(
  'calculate-moonshot-rbg-scores-daily',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL') || '/functions/v1/calculate-moonshot-rbg-scores',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
  $$
);

-- 2. check-integration-health (every 30 minutes)
SELECT cron.unschedule('check-integration-health');
SELECT cron.schedule(
  'check-integration-health',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL') || '/functions/v1/check-integration-health',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);

-- 3. check-scheduled-reports-hourly (every hour on the hour)
SELECT cron.unschedule('check-scheduled-reports-hourly');
SELECT cron.schedule(
  'check-scheduled-reports-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL') || '/functions/v1/check-scheduled-reports',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);

-- 4. deliver-pending-reports-hourly (5 minutes past every hour)
SELECT cron.unschedule('deliver-pending-reports-hourly');
SELECT cron.schedule(
  'deliver-pending-reports-hourly',
  '5 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL') || '/functions/v1/deliver-pending-reports',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
  $$
);

-- 5. moonshot-email-scheduler (every hour on the hour)
SELECT cron.unschedule('moonshot-email-scheduler');
SELECT cron.schedule(
  'moonshot-email-scheduler',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL') || '/functions/v1/moonshot-email-scheduler',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
  $$
);

-- 6. pregenerate-reports-offpeak-2am (daily at 7:00 UTC / 2:00 AM EST)
SELECT cron.unschedule('pregenerate-reports-offpeak-2am');
SELECT cron.schedule(
  'pregenerate-reports-offpeak-2am',
  '0 7 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL') || '/functions/v1/check-scheduled-reports',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY')
    ),
    body := '{"pregenerate": true, "hoursAhead": 7}'::jsonb,
    timeout_milliseconds := 120000
  );
  $$
);

-- 7. process-overnight-assistant (daily at 8:00 UTC / 3:00 AM EST)
SELECT cron.unschedule('process-overnight-assistant');
SELECT cron.schedule(
  'process-overnight-assistant',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL') || '/functions/v1/process-overnight-assistant',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
  $$
);

-- 8. process-pending-campaigns (every 5 minutes)
SELECT cron.unschedule('process-pending-campaigns');
SELECT cron.schedule(
  'process-pending-campaigns',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL') || '/functions/v1/process-pending-campaigns',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);

-- 9. process-proactive-notifications (every 15 minutes) - already using vault
-- No changes needed

-- 10. process-recurring-emails (every 15 minutes)
SELECT cron.unschedule('process-recurring-emails');
SELECT cron.schedule(
  'process-recurring-emails',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL') || '/functions/v1/process-recurring-marketing-emails',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
  $$
);

-- 11. process-recurring-marketing-emails (every hour on the hour)
SELECT cron.unschedule('process-recurring-marketing-emails');
SELECT cron.schedule(
  'process-recurring-marketing-emails',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL') || '/functions/v1/process-recurring-marketing-emails',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
  $$
);

-- 12. process-scheduled-tasks (every 15 minutes)
SELECT cron.unschedule('process-scheduled-tasks');
SELECT cron.schedule(
  'process-scheduled-tasks',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL') || '/functions/v1/process-scheduled-tasks',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);

-- 13. process-scheduled-team-dashboard (daily at 5:00 UTC / midnight EST)
SELECT cron.unschedule('process-scheduled-team-dashboard');
SELECT cron.schedule(
  'process-scheduled-team-dashboard',
  '0 5 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL') || '/functions/v1/process-scheduled-team-dashboard',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 600000
  );
  $$
);

-- 14. process-scheduled-team-pulse (Mondays at 8:00 UTC / 3:00 AM EST)
SELECT cron.unschedule('process-scheduled-team-pulse');
SELECT cron.schedule(
  'process-scheduled-team-pulse',
  '0 8 * * 1',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL') || '/functions/v1/process-scheduled-team-pulse',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);

-- 15. refresh-google-tokens-every-10min (every 10 minutes)
SELECT cron.unschedule('refresh-google-tokens-every-10min');
SELECT cron.schedule(
  'refresh-google-tokens-every-10min',
  '*/10 * * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL') || '/functions/v1/refresh-google-tokens',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
  $$
);
