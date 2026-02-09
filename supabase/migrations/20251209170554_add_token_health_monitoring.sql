/*
  # Token Health Monitoring System

  ## Overview
  Creates a system to track token refresh success/failure and alert when tokens expire

  ## 1. Tables
    - token_refresh_logs: Track every refresh attempt

  ## 2. Functions
    - get_token_health_summary: Provides health metrics

  ## 3. Purpose
    - Understand WHY tokens are failing
    - Alert admins when multiple tokens fail
    - Track user reconnection patterns
*/

-- Create token refresh logs table
CREATE TABLE IF NOT EXISTS token_refresh_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
  service text NOT NULL CHECK (service IN ('google_drive', 'gmail')),
  refresh_attempt_at timestamptz DEFAULT now(),
  success boolean NOT NULL,
  error_code text,
  error_message text,
  previous_expiry timestamptz,
  new_expiry timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create index for querying recent attempts
CREATE INDEX IF NOT EXISTS idx_token_refresh_logs_user_service
  ON token_refresh_logs(user_id, service, refresh_attempt_at DESC);

-- Create index for failure analysis
CREATE INDEX IF NOT EXISTS idx_token_refresh_logs_failures
  ON token_refresh_logs(success, refresh_attempt_at DESC)
  WHERE success = false;

-- Enable RLS
ALTER TABLE token_refresh_logs ENABLE ROW LEVEL SECURITY;

-- Super admins can view all logs
CREATE POLICY "Super admins can view all refresh logs"
  ON token_refresh_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.email IN (
        'clay@healthrocket.life',
        'clay@rockethub.ai',
        'clayspeakman@gmail.com'
      )
    )
  );

-- Users can view their own logs
CREATE POLICY "Users can view own refresh logs"
  ON token_refresh_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Create function to get token health summary
CREATE OR REPLACE FUNCTION get_token_health_summary()
RETURNS TABLE(
  total_connections bigint,
  active_connections bigint,
  expired_connections bigint,
  failure_rate_24h numeric,
  recent_failures json
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::bigint as total_connections,
    COUNT(*) FILTER (WHERE is_active = true)::bigint as active_connections,
    COUNT(*) FILTER (WHERE is_active = false AND connection_status = 'token_expired')::bigint as expired_connections,
    COALESCE(
      (SELECT COUNT(*) FILTER (WHERE success = false)::numeric / NULLIF(COUNT(*)::numeric, 0) * 100
       FROM token_refresh_logs
       WHERE refresh_attempt_at > now() - interval '24 hours'),
      0
    ) as failure_rate_24h,
    COALESCE(
      (SELECT json_agg(
        json_build_object(
          'user_id', user_id,
          'service', service,
          'error_code', error_code,
          'error_message', error_message,
          'attempt_at', refresh_attempt_at
        )
      )
      FROM (
        SELECT user_id, service, error_code, error_message, refresh_attempt_at
        FROM token_refresh_logs
        WHERE success = false
        AND refresh_attempt_at > now() - interval '24 hours'
        ORDER BY refresh_attempt_at DESC
        LIMIT 10
      ) recent),
      '[]'::json
    ) as recent_failures
  FROM user_drive_connections;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_token_health_summary() TO authenticated;

COMMENT ON TABLE token_refresh_logs IS 'Tracks all token refresh attempts for debugging and monitoring';
COMMENT ON FUNCTION get_token_health_summary IS 'Provides token health metrics for admin dashboard';
