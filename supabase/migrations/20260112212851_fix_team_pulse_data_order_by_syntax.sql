/*
  # Fix Team Pulse Data ORDER BY Syntax Error

  1. Overview
    Fixes the SQL error where ORDER BY was incorrectly placed outside the subquery
    when using DISTINCT ON and jsonb_agg.

  2. Changes
    - Remove ORDER BY from outside the subquery
    - Use proper ordering inside the subquery with DISTINCT ON
*/

CREATE OR REPLACE FUNCTION get_team_pulse_data(p_team_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
  v_team_info jsonb;
  v_meeting_content jsonb;
  v_strategy_content jsonb;
  v_financial_content jsonb;
  v_product_content jsonb;
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

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'file_name', file_name,
      'content', LEFT(content, 1500),
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
    LIMIT 20
  ) meetings;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'file_name', file_name,
      'content', LEFT(content, 1500),
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
      AND COALESCE(file_modified_at, created_at) >= v_thirty_days_ago
    ORDER BY google_file_id, COALESCE(file_modified_at, created_at) DESC
    LIMIT 15
  ) strategy;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'file_name', file_name,
      'content', LEFT(content, 1500),
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
    LIMIT 15
  ) financial;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'file_name', file_name,
      'content', LEFT(content, 1500),
      'date', file_date
    )
  ), '[]'::jsonb) INTO v_product_content
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
    LIMIT 12
  ) product;

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
      'content', LEFT(content, 1000),
      'category', doc_category,
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
    LIMIT 12
  ) general;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'user_name', user_name,
      'message', LEFT(message, 800),
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
    LIMIT 25
  ) chats;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'prompt', LEFT(astra_prompt, 300),
      'response', LEFT(message, 1500),
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
    LIMIT 15
  ) reports;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'category', doc_category,
      'document_count', cnt
    )
  ), '[]'::jsonb) INTO v_category_summary
  FROM (
    SELECT doc_category, COUNT(DISTINCT google_file_id) as cnt
    FROM document_chunks
    WHERE team_id = p_team_id
      AND doc_category IS NOT NULL
      AND COALESCE(file_modified_at, created_at) >= v_thirty_days_ago
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
    'health_score', health_score,
    'health_factors', health_factors,
    'insights_and_trends', insights_and_trends
  ) INTO v_previous_snapshot
  FROM team_pulse_snapshots
  WHERE team_id = p_team_id
    AND is_current = true
  ORDER BY generated_at DESC
  LIMIT 1;

  v_result := jsonb_build_object(
    'team_info', COALESCE(v_team_info, '{}'::jsonb),
    'meeting_content', COALESCE(v_meeting_content, '[]'::jsonb),
    'strategy_content', COALESCE(v_strategy_content, '[]'::jsonb),
    'financial_content', COALESCE(v_financial_content, '[]'::jsonb),
    'projects_content', COALESCE(v_product_content, '[]'::jsonb),
    'operations_content', COALESCE(v_operational_content, '[]'::jsonb),
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