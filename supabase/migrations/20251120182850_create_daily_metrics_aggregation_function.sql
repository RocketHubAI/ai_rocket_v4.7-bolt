/*
  # Create Daily Metrics Aggregation Function
  
  Creates a helper function to aggregate daily metrics for dashboard queries.
  This function provides fast, pre-computed daily statistics.
  
  ## Function: get_daily_metrics_aggregated
  
  Returns aggregated metrics per day including:
  - metric_date: The date for the metrics
  - daily_active_users: Count of unique users active that day
  - total_messages: Sum of all messages sent that day
  - total_reports: Sum of all reports generated that day
  - total_visualizations: Sum of all visualizations created that day
  
  Parameters:
  - p_start_date (date): Start date for aggregation
  - p_end_date (date): End date for aggregation
  
  Security:
  - Function is SECURITY DEFINER (runs with creator permissions)
  - Only accessible to authenticated users
  - Caller must be super admin to see all data
*/

CREATE OR REPLACE FUNCTION get_daily_metrics_aggregated(
  p_start_date date,
  p_end_date date
)
RETURNS TABLE (
  metric_date date,
  daily_active_users bigint,
  total_messages bigint,
  total_reports bigint,
  total_visualizations bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if caller is super admin
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.email IN ('clay@rockethub.ai', 'derek@rockethub.ai', 'marshall@rockethub.ai')
  ) THEN
    -- Return empty result if not super admin
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    m.metric_date,
    COUNT(DISTINCT m.user_id)::bigint as daily_active_users,
    COALESCE(SUM(m.messages_sent), 0)::bigint as total_messages,
    COALESCE(SUM(m.reports_generated), 0)::bigint as total_reports,
    COALESCE(SUM(m.visualizations_created), 0)::bigint as total_visualizations
  FROM user_metrics_daily m
  WHERE m.metric_date BETWEEN p_start_date AND p_end_date
  GROUP BY m.metric_date
  ORDER BY m.metric_date ASC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_daily_metrics_aggregated TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_daily_metrics_aggregated IS 'Aggregates daily metrics for dashboard queries. Only accessible to super admins.';
