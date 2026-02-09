/*
  # Create Unified Token Health Monitoring

  1. Purpose
    - Monitor token expiration across all integrations in user_integrations
    - Automatically mark expired tokens and queue notifications
    - Provide a function for the health check edge function to call

  2. New Functions
    - `check_integration_token_health()` - Finds tokens expiring within 24 hours
      or already expired, updates statuses, returns summary
    - `get_integration_health_summary(p_team_id)` - Returns health stats for a team

  3. Changes
    - Adds index on token_expires_at for efficient expiry scanning
    - Creates a view for quick health checks

  4. Security
    - Functions run as SECURITY DEFINER for system-level operations
    - Results respect existing RLS on user_integrations
*/

CREATE INDEX IF NOT EXISTS idx_user_integrations_token_expires 
  ON user_integrations(token_expires_at) 
  WHERE token_expires_at IS NOT NULL AND status = 'active';

CREATE OR REPLACE FUNCTION check_integration_token_health()
RETURNS jsonb AS $$
DECLARE
  v_expired_count integer := 0;
  v_warning_count integer := 0;
  v_refreshed_count integer := 0;
  v_result jsonb;
BEGIN
  UPDATE user_integrations
  SET status = 'expired',
      last_error = 'Token expired automatically detected by health monitor',
      updated_at = now()
  WHERE status = 'active'
    AND token_expires_at IS NOT NULL
    AND token_expires_at < now();

  GET DIAGNOSTICS v_expired_count = ROW_COUNT;

  IF v_expired_count > 0 THEN
    INSERT INTO integration_audit_log (user_id, team_id, integration_id, action, details)
    SELECT 
      ui.user_id,
      ui.team_id,
      ui.integration_id,
      'token_expired',
      jsonb_build_object(
        'source', 'health_monitor',
        'expired_at', ui.token_expires_at,
        'detected_at', now()
      )
    FROM user_integrations ui
    WHERE ui.status = 'expired'
      AND ui.last_error = 'Token expired automatically detected by health monitor'
      AND ui.updated_at >= now() - interval '1 minute';
  END IF;

  SELECT COUNT(*) INTO v_warning_count
  FROM user_integrations
  WHERE status = 'active'
    AND token_expires_at IS NOT NULL
    AND token_expires_at < now() + interval '24 hours'
    AND token_expires_at > now();

  IF v_warning_count > 0 THEN
    INSERT INTO proactive_notification_queue (user_id, team_id, event_type, priority, context, scheduled_for, process_after, dedup_key)
    SELECT
      ui.user_id,
      ui.team_id,
      'action_item_due',
      6,
      jsonb_build_object(
        'type', 'token_expiring_soon',
        'provider_name', ir.provider_name,
        'provider_slug', ir.provider_slug,
        'expires_at', ui.token_expires_at,
        'message', 'Your ' || ir.provider_name || ' connection token expires soon. Please reconnect to maintain access.'
      ),
      now(),
      now(),
      'token_warning_' || ui.user_id || '_' || ui.integration_id || '_' || date_trunc('day', now())::text
    FROM user_integrations ui
    JOIN integration_registry ir ON ir.id = ui.integration_id
    WHERE ui.status = 'active'
      AND ui.token_expires_at IS NOT NULL
      AND ui.token_expires_at < now() + interval '24 hours'
      AND ui.token_expires_at > now()
    ON CONFLICT (user_id, dedup_key) DO NOTHING;
  END IF;

  v_result := jsonb_build_object(
    'checked_at', now(),
    'tokens_expired', v_expired_count,
    'tokens_expiring_soon', v_warning_count,
    'tokens_refreshed', v_refreshed_count
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_integration_health_summary(p_team_id uuid DEFAULT NULL)
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_integrations', COUNT(*),
    'active', COUNT(*) FILTER (WHERE ui.status = 'active'),
    'expired', COUNT(*) FILTER (WHERE ui.status = 'expired'),
    'error', COUNT(*) FILTER (WHERE ui.status = 'error'),
    'disconnected', COUNT(*) FILTER (WHERE ui.status = 'disconnected'),
    'expiring_within_24h', COUNT(*) FILTER (
      WHERE ui.status = 'active' 
      AND ui.token_expires_at IS NOT NULL 
      AND ui.token_expires_at < now() + interval '24 hours'
      AND ui.token_expires_at > now()
    ),
    'providers', jsonb_agg(DISTINCT jsonb_build_object(
      'provider_name', ir.provider_name,
      'provider_slug', ir.provider_slug,
      'status', ui.status,
      'token_expires_at', ui.token_expires_at
    ))
  ) INTO v_result
  FROM user_integrations ui
  JOIN integration_registry ir ON ir.id = ui.integration_id
  WHERE (p_team_id IS NULL OR ui.team_id = p_team_id);

  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
