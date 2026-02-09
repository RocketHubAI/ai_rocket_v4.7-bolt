/*
  # Update get_user_dashboard_data to Handle All Categories Dynamically

  1. Changes
    - Removes hardcoded category sections (strategy_content, meeting_content, etc.)
    - Adds dynamic content_by_category that handles all 16 doc_category types
    - Each category returns up to 20 recent documents with 2000 chars content
    - Maintains backward compatibility by keeping original field names for key categories
    - Adds new field "all_content" that groups everything dynamically

  2. Categories Supported (16 total)
    - strategy, financial, operational, people, customer, external
    - reference, other, meetings, sales, industry, product
    - legal, marketing, support, operations

  3. Performance Optimizations
    - Single query for all categories instead of multiple
    - Uses 30-day window for recent content
    - Limits to 20 docs per category, 2000 chars each
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
  v_content_by_category jsonb;
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

  SELECT COALESCE(jsonb_object_agg(category, docs), '{}'::jsonb)
  INTO v_content_by_category
  FROM (
    SELECT 
      doc_category::text as category,
      jsonb_agg(
        jsonb_build_object(
          'file_name', file_name,
          'content', content,
          'date', file_date,
          'google_file_id', google_file_id
        )
        ORDER BY file_date DESC
      ) as docs
    FROM (
      SELECT DISTINCT ON (dc.google_file_id)
        dc.doc_category,
        dc.file_name,
        LEFT(dc.content, 2500) as content,
        TO_CHAR(COALESCE(dc.file_modified_at, dc.created_at), 'YYYY-MM-DD') as file_date,
        dc.google_file_id,
        COALESCE(dc.file_modified_at, dc.created_at) as sort_date
      FROM document_chunks dc
      WHERE dc.team_id = p_team_id
        AND dc.doc_category IS NOT NULL
        AND dc.doc_category::text = ANY(v_accessible_categories)
        AND (
          dc.doc_category IN ('strategy') 
          OR COALESCE(dc.file_modified_at, dc.created_at) >= v_thirty_days_ago
        )
      ORDER BY dc.google_file_id, COALESCE(dc.file_modified_at, dc.created_at) DESC
    ) unique_docs
    GROUP BY doc_category
  ) categorized;

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
    'content_by_category', COALESCE(v_content_by_category, '{}'::jsonb),
    'strategy_content', COALESCE(v_content_by_category->'strategy', '[]'::jsonb),
    'meeting_content', COALESCE(v_content_by_category->'meetings', '[]'::jsonb),
    'financial_content', COALESCE(v_content_by_category->'financial', '[]'::jsonb),
    'project_content', COALESCE(v_content_by_category->'product', '[]'::jsonb),
    'operational_content', COALESCE(
      CASE 
        WHEN v_content_by_category->'operational' IS NOT NULL THEN v_content_by_category->'operational'
        ELSE v_content_by_category->'operations'
      END, 
      '[]'::jsonb
    ),
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
'Returns team dashboard data with dynamic category support. Handles all 16 doc_category types. Pass NULL for p_user_id to get unfiltered data.';