/*
  # Create Function for Filtered Marketing Recipients

  1. Purpose
    - Returns users matching specified filter criteria for marketing emails
    - Supports filtering by launch status, activity, role, account age, and feature usage
    - Returns user count and emails list

  2. Filter Criteria
    - launch_status: 'launched', 'onboarding', 'all'
    - current_stage: 'fuel', 'guidance', 'boosters', 'all'
    - drive_connected: 'connected', 'not_connected', 'all'
    - activity_level: 'active_7d', 'active_30d', 'inactive_30d', 'all'
    - user_role: 'admin', 'member', 'all'
    - account_age: 'new_7d', 'new_30d', 'established', 'all'
    - has_visualizations: true, false, null (ignore)
    - has_scheduled_reports: true, false, null (ignore)
    - has_messages: true, false, null (ignore)

  3. Security
    - Function is accessible to authenticated users
    - Returns only user emails and names, not sensitive data
*/

CREATE OR REPLACE FUNCTION get_filtered_marketing_recipients(
  p_launch_status text DEFAULT 'all',
  p_current_stage text DEFAULT 'all',
  p_drive_connected text DEFAULT 'all',
  p_activity_level text DEFAULT 'all',
  p_user_role text DEFAULT 'all',
  p_account_age text DEFAULT 'all',
  p_has_visualizations boolean DEFAULT NULL,
  p_has_scheduled_reports boolean DEFAULT NULL,
  p_has_messages boolean DEFAULT NULL
)
RETURNS TABLE (
  user_count bigint,
  user_emails jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_ids uuid[];
  v_user_emails jsonb;
  v_count bigint;
BEGIN
  SELECT ARRAY_AGG(u.id), COUNT(*), jsonb_agg(
    jsonb_build_object(
      'id', u.id,
      'email', u.email,
      'name', u.name,
      'is_launched', COALESCE(uls.is_launched, false),
      'current_stage', COALESCE(uls.current_stage, 'fuel'),
      'role', u.role,
      'created_at', u.created_at
    )
  )
  INTO v_user_ids, v_count, v_user_emails
  FROM users u
  LEFT JOIN user_launch_status uls ON u.id = uls.user_id
  LEFT JOIN user_drive_connections udc ON u.team_id = udc.team_id AND udc.is_active = true
  WHERE
    -- Launch status filter
    (
      p_launch_status = 'all' OR
      (p_launch_status = 'launched' AND COALESCE(uls.is_launched, false) = true) OR
      (p_launch_status = 'onboarding' AND COALESCE(uls.is_launched, false) = false)
    )
    -- Current stage filter
    AND (
      p_current_stage = 'all' OR
      LOWER(COALESCE(uls.current_stage, 'fuel')) = LOWER(p_current_stage)
    )
    -- Drive connected filter
    AND (
      p_drive_connected = 'all' OR
      (p_drive_connected = 'connected' AND udc.id IS NOT NULL) OR
      (p_drive_connected = 'not_connected' AND udc.id IS NULL)
    )
    -- Activity level filter
    AND (
      p_activity_level = 'all' OR
      (p_activity_level = 'active_7d' AND u.last_active_at >= NOW() - INTERVAL '7 days') OR
      (p_activity_level = 'active_30d' AND u.last_active_at >= NOW() - INTERVAL '30 days') OR
      (p_activity_level = 'inactive_30d' AND (u.last_active_at IS NULL OR u.last_active_at < NOW() - INTERVAL '30 days'))
    )
    -- User role filter
    AND (
      p_user_role = 'all' OR
      LOWER(COALESCE(u.role, 'member')) = LOWER(p_user_role)
    )
    -- Account age filter
    AND (
      p_account_age = 'all' OR
      (p_account_age = 'new_7d' AND u.created_at >= NOW() - INTERVAL '7 days') OR
      (p_account_age = 'new_30d' AND u.created_at >= NOW() - INTERVAL '30 days') OR
      (p_account_age = 'established' AND u.created_at < NOW() - INTERVAL '30 days')
    )
    -- Feature usage filters
    AND (
      p_has_visualizations IS NULL OR
      (p_has_visualizations = true AND COALESCE(uls.total_visualizations, 0) > 0) OR
      (p_has_visualizations = false AND COALESCE(uls.total_visualizations, 0) = 0)
    )
    AND (
      p_has_scheduled_reports IS NULL OR
      (p_has_scheduled_reports = true AND COALESCE(uls.total_scheduled_reports, 0) > 0) OR
      (p_has_scheduled_reports = false AND COALESCE(uls.total_scheduled_reports, 0) = 0)
    )
    AND (
      p_has_messages IS NULL OR
      (p_has_messages = true AND COALESCE(uls.total_messages, 0) > 0) OR
      (p_has_messages = false AND COALESCE(uls.total_messages, 0) = 0)
    );

  RETURN QUERY SELECT COALESCE(v_count, 0)::bigint, COALESCE(v_user_emails, '[]'::jsonb);
END;
$$;

COMMENT ON FUNCTION get_filtered_marketing_recipients IS 'Returns filtered list of users for marketing email campaigns based on various criteria';
