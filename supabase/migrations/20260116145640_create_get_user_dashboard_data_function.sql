/*
  # Create get_user_dashboard_data Function

  1. Purpose
    - Similar to get_team_dashboard_data but filters by user's category access
    - Returns only data from categories the user has access to
    - Supports personalized Team Dashboard experience

  2. Parameters
    - p_team_id: The team to get data for
    - p_user_id: The user whose category access to respect (NULL for full access)

  3. Category Access Logic
    - If user has explicit has_access = false for a category, exclude it
    - If no explicit record exists, default to has_access = true
    - NULL p_user_id bypasses all filtering (returns all data)

  4. Data Returned
    - Same structure as get_team_dashboard_data
    - But filtered by user's accessible categories
    - Includes accessible_categories array showing what was included
*/

CREATE OR REPLACE FUNCTION get_user_dashboard_data(p_team_id uuid, p_user_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
  v_team_info jsonb;
  v_mission_values_context jsonb;
  v_goals_context jsonb;
  v_strategy_content jsonb;
  v_meeting_content jsonb;
  v_financial_content jsonb;
  v_project_content jsonb;
  v_operational_content jsonb;
  v_general_content jsonb;
  v_team_discussions jsonb;
  v_recent_reports jsonb;
  v_category_summary jsonb;
  v_member_info jsonb;
  v_previous_snapshot jsonb;
  v_accessible_categories text[];
  v_thirty_days_ago timestamptz := now() - interval '30 days';
BEGIN
  IF p_user_id IS NOT NULL THEN
    SELECT ARRAY_AGG(uca.category)
    INTO v_accessible_categories
    FROM user_category_access uca
    WHERE uca.user_id = p_user_id
      AND uca.team_id = p_team_id
      AND uca.has_access = true;
    
    IF v_accessible_categories IS NULL THEN
      SELECT ARRAY_AGG(DISTINCT doc_category::text)
      INTO v_accessible_categories
      FROM document_chunks
      WHERE team_id = p_team_id
        AND doc_category IS NOT NULL;
    END IF;
  ELSE
    SELECT ARRAY_AGG(DISTINCT doc_category::text)
    INTO v_accessible_categories
    FROM document_chunks
    WHERE team_id = p_team_id
      AND doc_category IS NOT NULL;
  END IF;

  IF v_accessible_categories IS NULL THEN
    v_accessible_categories := ARRAY[]::text[];
  END IF;

  SELECT jsonb_build_object(
    'team_id', t.id,
    'team_name', t.name,
    'created_at', t.created_at
  ) INTO v_team_info
  FROM teams t
  WHERE t.id = p_team_id;

  IF 'strategy' = ANY(v_accessible_categories) THEN
    SELECT get_mission_values_context(p_team_id) INTO v_mission_values_context;
    SELECT get_goals_context(p_team_id) INTO v_goals_context;
  ELSE
    v_mission_values_context := '{}'::jsonb;
    v_goals_context := '{}'::jsonb;
  END IF;

  IF 'strategy' = ANY(v_accessible_categories) THEN
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'file_name', file_name,
        'content', LEFT(content, 3000),
        'date', file_date
      )
    ), '[]'::jsonb) INTO v_strategy_content
    FROM (
      SELECT DISTINCT ON (google_file_id) 
        file_name, 
        content, 
        TO_CHAR(COALESCE(file_modified_at, created_at), 'YYYY-MM-DD') as file_date
      FROM document_chunks
      WHERE team_id = p_team_id
        AND doc_category = 'strategy'
      ORDER BY google_file_id, COALESCE(file_modified_at, created_at) DESC
      LIMIT 25
    ) strategy;
  ELSE
    v_strategy_content := '[]'::jsonb;
  END IF;

  IF 'meetings' = ANY(v_accessible_categories) THEN
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'file_name', file_name,
        'content', LEFT(content, 2500),
        'date', file_date
      )
    ), '[]'::jsonb) INTO v_meeting_content
    FROM (
      SELECT DISTINCT ON (google_file_id) 
        file_name, 
        content, 
        TO_CHAR(COALESCE(file_modified_at, created_at), 'YYYY-MM-DD') as file_date
      FROM document_chunks
      WHERE team_id = p_team_id
        AND doc_category = 'meetings'
        AND COALESCE(file_modified_at, created_at) >= v_thirty_days_ago
      ORDER BY google_file_id, COALESCE(file_modified_at, created_at) DESC
      LIMIT 30
    ) meetings;
  ELSE
    v_meeting_content := '[]'::jsonb;
  END IF;

  IF 'financial' = ANY(v_accessible_categories) THEN
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'file_name', file_name,
        'content', LEFT(content, 2000),
        'date', file_date
      )
    ), '[]'::jsonb) INTO v_financial_content
    FROM (
      SELECT DISTINCT ON (google_file_id) 
        file_name, 
        content, 
        TO_CHAR(COALESCE(file_modified_at, created_at), 'YYYY-MM-DD') as file_date
      FROM document_chunks
      WHERE team_id = p_team_id
        AND doc_category = 'financial'
        AND COALESCE(file_modified_at, created_at) >= v_thirty_days_ago
      ORDER BY google_file_id, COALESCE(file_modified_at, created_at) DESC
      LIMIT 20
    ) financial;
  ELSE
    v_financial_content := '[]'::jsonb;
  END IF;

  IF 'product' = ANY(v_accessible_categories) THEN
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'file_name', file_name,
        'content', LEFT(content, 2000),
        'date', file_date
      )
    ), '[]'::jsonb) INTO v_project_content
    FROM (
      SELECT DISTINCT ON (google_file_id) 
        file_name, 
        content, 
        TO_CHAR(COALESCE(file_modified_at, created_at), 'YYYY-MM-DD') as file_date
      FROM document_chunks
      WHERE team_id = p_team_id
        AND doc_category = 'product'
        AND COALESCE(file_modified_at, created_at) >= v_thirty_days_ago
      ORDER BY google_file_id, COALESCE(file_modified_at, created_at) DESC
      LIMIT 15
    ) projects;
  ELSE
    v_project_content := '[]'::jsonb;
  END IF;

  IF 'operational' = ANY(v_accessible_categories) OR 'operations' = ANY(v_accessible_categories) THEN
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'file_name', file_name,
        'content', LEFT(content, 1500),
        'date', file_date
      )
    ), '[]'::jsonb) INTO v_operational_content
    FROM (
      SELECT DISTINCT ON (google_file_id) 
        file_name, 
        content, 
        TO_CHAR(COALESCE(file_modified_at, created_at), 'YYYY-MM-DD') as file_date
      FROM document_chunks
      WHERE team_id = p_team_id
        AND doc_category IN ('operational', 'operations')
        AND COALESCE(file_modified_at, created_at) >= v_thirty_days_ago
      ORDER BY google_file_id, COALESCE(file_modified_at, created_at) DESC
      LIMIT 10
    ) operational;
  ELSE
    v_operational_content := '[]'::jsonb;
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'file_name', file_name,
      'content', LEFT(content, 1200),
      'category', doc_category::text,
      'date', file_date
    )
  ), '[]'::jsonb) INTO v_general_content
  FROM (
    SELECT DISTINCT ON (google_file_id) 
      file_name, 
      content, 
      doc_category, 
      TO_CHAR(COALESCE(file_modified_at, created_at), 'YYYY-MM-DD') as file_date
    FROM document_chunks
    WHERE team_id = p_team_id
      AND doc_category NOT IN ('meetings', 'strategy', 'financial', 'product', 'operational', 'operations')
      AND doc_category::text = ANY(v_accessible_categories)
      AND COALESCE(file_modified_at, created_at) >= v_thirty_days_ago
    ORDER BY google_file_id, COALESCE(file_modified_at, created_at) DESC
    LIMIT 15
  ) general;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'user_name', user_name,
      'message', LEFT(message, 1000),
      'date', TO_CHAR(created_at, 'YYYY-MM-DD')
    )
  ), '[]'::jsonb) INTO v_team_discussions
  FROM (
    SELECT user_name, message, created_at
    FROM astra_chats
    WHERE user_id IN (SELECT id FROM public.users WHERE team_id = p_team_id)
      AND mode = 'team'
      AND message_type = 'user'
      AND created_at >= v_thirty_days_ago
    ORDER BY created_at DESC
    LIMIT 30
  ) chats;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'prompt', LEFT(astra_prompt, 400),
      'response', LEFT(message, 2000),
      'date', TO_CHAR(created_at, 'YYYY-MM-DD')
    )
  ), '[]'::jsonb) INTO v_recent_reports
  FROM (
    SELECT astra_prompt, message, created_at
    FROM astra_chats
    WHERE user_id IN (SELECT id FROM public.users WHERE team_id = p_team_id)
      AND mode = 'reports'
      AND message_type = 'assistant'
      AND created_at >= v_thirty_days_ago
    ORDER BY created_at DESC
    LIMIT 20
  ) reports;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'category', doc_category::text,
      'document_count', cnt,
      'recent_count', recent_cnt,
      'has_access', doc_category::text = ANY(v_accessible_categories)
    )
  ), '[]'::jsonb) INTO v_category_summary
  FROM (
    SELECT 
      doc_category, 
      COUNT(DISTINCT google_file_id) as cnt,
      COUNT(DISTINCT CASE WHEN COALESCE(file_modified_at, created_at) >= v_thirty_days_ago THEN google_file_id END) as recent_cnt
    FROM document_chunks
    WHERE team_id = p_team_id
      AND doc_category IS NOT NULL
    GROUP BY doc_category
    ORDER BY cnt DESC
  ) cats;

  SELECT jsonb_build_object(
    'total_members', COUNT(*),
    'members', COALESCE(jsonb_agg(
      jsonb_build_object(
        'name', COALESCE(name, email),
        'role', role
      )
    ), '[]'::jsonb)
  ) INTO v_member_info
  FROM public.users
  WHERE team_id = p_team_id;

  SELECT jsonb_build_object(
    'generated_at', generated_at,
    'goals_progress', goals_progress,
    'alignment_metrics', alignment_metrics,
    'health_overview', health_overview
  ) INTO v_previous_snapshot
  FROM team_dashboard_snapshots
  WHERE team_id = p_team_id
    AND (target_user_id = p_user_id OR (p_user_id IS NULL AND target_user_id IS NULL))
    AND is_current = true
  ORDER BY generated_at DESC
  LIMIT 1;

  v_result := jsonb_build_object(
    'team_info', COALESCE(v_team_info, '{}'::jsonb),
    'mission_values_context', COALESCE(v_mission_values_context, '{}'::jsonb),
    'goals_context', COALESCE(v_goals_context, '{}'::jsonb),
    'strategy_content', COALESCE(v_strategy_content, '[]'::jsonb),
    'meeting_content', COALESCE(v_meeting_content, '[]'::jsonb),
    'financial_content', COALESCE(v_financial_content, '[]'::jsonb),
    'project_content', COALESCE(v_project_content, '[]'::jsonb),
    'operational_content', COALESCE(v_operational_content, '[]'::jsonb),
    'general_content', COALESCE(v_general_content, '[]'::jsonb),
    'team_discussions', COALESCE(v_team_discussions, '[]'::jsonb),
    'recent_reports', COALESCE(v_recent_reports, '[]'::jsonb),
    'category_summary', COALESCE(v_category_summary, '[]'::jsonb),
    'member_info', COALESCE(v_member_info, '{}'::jsonb),
    'previous_snapshot', COALESCE(v_previous_snapshot, '{}'::jsonb),
    'accessible_categories', to_jsonb(v_accessible_categories),
    'target_user_id', p_user_id,
    'generated_at', now()
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION get_user_dashboard_data(uuid, uuid) IS 
'Returns team dashboard data filtered by user category access. Pass NULL for p_user_id to get unfiltered data.';
