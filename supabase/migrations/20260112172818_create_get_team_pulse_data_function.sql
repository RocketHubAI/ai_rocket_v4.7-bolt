/*
  # Create get_team_pulse_data Function

  1. Overview
    This function aggregates team data for generating Team Pulse snapshots.
    It collects documents, chats, reports, and team metadata.

  2. Function Details
    - `get_team_pulse_data(p_team_id uuid)`: Returns aggregated team data as JSONB
    - Returns document stats, category breakdown, recent content, team info
    - Used by the generate-team-pulse Edge Function

  3. Data Aggregated
    - Document counts by category
    - Recent document content samples
    - Team chat messages (last 30 days)
    - Report content (last 30 days)
    - Team member count and roles
    - Sync status and fuel level
    - Previous snapshot for trend comparison
*/

CREATE OR REPLACE FUNCTION get_team_pulse_data(p_team_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
  v_team_info jsonb;
  v_document_stats jsonb;
  v_category_breakdown jsonb;
  v_recent_content jsonb;
  v_team_chat jsonb;
  v_reports jsonb;
  v_member_info jsonb;
  v_sync_status jsonb;
  v_previous_snapshot jsonb;
  v_fuel_level numeric;
BEGIN
  -- Get team info
  SELECT jsonb_build_object(
    'team_id', t.id,
    'team_name', t.name,
    'total_launch_points', t.total_launch_points,
    'created_at', t.created_at
  ) INTO v_team_info
  FROM teams t
  WHERE t.id = p_team_id;

  -- Get document statistics
  SELECT jsonb_build_object(
    'total_documents', COUNT(DISTINCT google_file_id),
    'total_chunks', COUNT(*),
    'documents_last_30_days', COUNT(DISTINCT google_file_id) FILTER (WHERE created_at >= now() - interval '30 days'),
    'documents_last_7_days', COUNT(DISTINCT google_file_id) FILTER (WHERE created_at >= now() - interval '7 days')
  ) INTO v_document_stats
  FROM document_chunks
  WHERE team_id = p_team_id;

  -- Get category breakdown
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'category', doc_category,
      'count', cnt
    )
  ), '[]'::jsonb) INTO v_category_breakdown
  FROM (
    SELECT doc_category, COUNT(DISTINCT google_file_id) as cnt
    FROM document_chunks
    WHERE team_id = p_team_id
      AND doc_category IS NOT NULL
    GROUP BY doc_category
    ORDER BY cnt DESC
  ) cats;

  -- Get recent content samples (last 30 days, up to 50 chunks for context)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'category', doc_category,
      'file_name', file_name,
      'content_preview', LEFT(content, 500),
      'created_at', created_at
    )
  ), '[]'::jsonb) INTO v_recent_content
  FROM (
    SELECT doc_category, file_name, content, created_at
    FROM document_chunks
    WHERE team_id = p_team_id
      AND created_at >= now() - interval '30 days'
    ORDER BY created_at DESC
    LIMIT 50
  ) recent;

  -- Get team chat messages (last 30 days)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'user_name', user_name,
      'message', LEFT(message, 500),
      'created_at', created_at
    )
  ), '[]'::jsonb) INTO v_team_chat
  FROM (
    SELECT user_name, message, created_at
    FROM astra_chats
    WHERE user_id IN (SELECT id FROM public.users WHERE team_id = p_team_id)
      AND mode = 'team'
      AND message_type = 'user'
      AND created_at >= now() - interval '30 days'
    ORDER BY created_at DESC
    LIMIT 30
  ) chats;

  -- Get report content (last 30 days)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'astra_prompt', LEFT(astra_prompt, 200),
      'response_preview', LEFT(message, 1000),
      'created_at', created_at
    )
  ), '[]'::jsonb) INTO v_reports
  FROM (
    SELECT astra_prompt, message, created_at
    FROM astra_chats
    WHERE user_id IN (SELECT id FROM public.users WHERE team_id = p_team_id)
      AND mode = 'reports'
      AND message_type = 'assistant'
      AND created_at >= now() - interval '30 days'
    ORDER BY created_at DESC
    LIMIT 20
  ) reports;

  -- Get member info
  SELECT jsonb_build_object(
    'total_members', COUNT(*),
    'admin_count', COUNT(*) FILTER (WHERE role = 'admin'),
    'member_count', COUNT(*) FILTER (WHERE role = 'member'),
    'active_last_7_days', COUNT(*) FILTER (WHERE last_active_at >= now() - interval '7 days')
  ) INTO v_member_info
  FROM public.users
  WHERE team_id = p_team_id;

  -- Get sync status and fuel level
  SELECT jsonb_build_object(
    'last_sync', MAX(started_at),
    'total_syncs', COUNT(*),
    'successful_syncs', COUNT(*) FILTER (WHERE status = 'completed')
  ) INTO v_sync_status
  FROM data_sync_sessions
  WHERE team_id = p_team_id;

  -- Calculate fuel level
  SELECT COALESCE(
    CASE 
      WHEN (SELECT COUNT(DISTINCT google_file_id) FROM document_chunks WHERE team_id = p_team_id) >= 100 THEN 100
      ELSE (SELECT COUNT(DISTINCT google_file_id) FROM document_chunks WHERE team_id = p_team_id)
    END,
    0
  ) INTO v_fuel_level;

  -- Get previous snapshot for trend comparison
  SELECT jsonb_build_object(
    'generated_at', generated_at,
    'health_score', health_score,
    'health_factors', health_factors
  ) INTO v_previous_snapshot
  FROM team_pulse_snapshots
  WHERE team_id = p_team_id
    AND is_current = true
  ORDER BY generated_at DESC
  LIMIT 1;

  -- Build final result
  v_result := jsonb_build_object(
    'team_info', COALESCE(v_team_info, '{}'::jsonb),
    'document_stats', COALESCE(v_document_stats, '{}'::jsonb),
    'category_breakdown', COALESCE(v_category_breakdown, '[]'::jsonb),
    'recent_content', COALESCE(v_recent_content, '[]'::jsonb),
    'team_chat', COALESCE(v_team_chat, '[]'::jsonb),
    'reports', COALESCE(v_reports, '[]'::jsonb),
    'member_info', COALESCE(v_member_info, '{}'::jsonb),
    'sync_status', COALESCE(v_sync_status, '{}'::jsonb),
    'fuel_level', v_fuel_level,
    'previous_snapshot', COALESCE(v_previous_snapshot, '{}'::jsonb),
    'generated_at', now()
  );

  RETURN v_result;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_team_pulse_data(uuid) TO authenticated;