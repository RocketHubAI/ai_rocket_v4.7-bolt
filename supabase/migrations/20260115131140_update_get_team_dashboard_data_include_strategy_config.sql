/*
  # Update get_team_dashboard_data to Include Strategy Config

  1. Changes
    - Add strategy_config to the returned data (mission, values, etc.)
    - Add configured_goals from team_goals table
    - These provide structured, curated data for the dashboard

  2. Logic
    - If team has strategy_config, include it
    - If team has active goals in team_goals, include them
    - Edge function will use these instead of re-extracting from documents
*/

CREATE OR REPLACE FUNCTION get_team_dashboard_data(p_team_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
  v_team_info jsonb;
  v_strategy_config jsonb;
  v_configured_goals jsonb;
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
  v_thirty_days_ago timestamptz := now() - interval '30 days';
BEGIN
  SELECT jsonb_build_object(
    'team_id', t.id,
    'team_name', t.name,
    'created_at', t.created_at
  ) INTO v_team_info
  FROM teams t
  WHERE t.id = p_team_id;

  SELECT jsonb_build_object(
    'mission_statement', mission_statement,
    'purpose', purpose,
    'niche', niche,
    'core_values', COALESCE(core_values, '{}'),
    'is_verified', is_verified,
    'extracted_from_document', extracted_from_document
  ) INTO v_strategy_config
  FROM team_strategy_config
  WHERE team_id = p_team_id;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', id,
      'name', name,
      'type', type,
      'status', status,
      'progress_percentage', progress_percentage,
      'notes', notes,
      'source_reference', source_reference,
      'deadline', deadline,
      'owner', owner
    ) ORDER BY display_order, created_at
  ), '[]'::jsonb) INTO v_configured_goals
  FROM team_goals
  WHERE team_id = p_team_id
    AND is_active = true;

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
      'recent_count', recent_cnt
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
    AND is_current = true
  ORDER BY generated_at DESC
  LIMIT 1;

  v_result := jsonb_build_object(
    'team_info', COALESCE(v_team_info, '{}'::jsonb),
    'strategy_config', COALESCE(v_strategy_config, '{}'::jsonb),
    'configured_goals', COALESCE(v_configured_goals, '[]'::jsonb),
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
    'generated_at', now()
  );

  RETURN v_result;
END;
$$;