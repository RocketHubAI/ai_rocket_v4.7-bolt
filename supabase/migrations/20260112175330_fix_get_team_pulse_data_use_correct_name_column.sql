/*
  # Fix get_team_pulse_data to Use Correct Column Name

  1. Overview
    Fixes the function to use 'name' instead of 'full_name' for the users table.

  2. Changes
    - Replace 'full_name' with 'name' in the member info query
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
BEGIN
  -- Get team info (basic, not app metrics)
  SELECT jsonb_build_object(
    'team_id', t.id,
    'team_name', t.name,
    'created_at', t.created_at
  ) INTO v_team_info
  FROM teams t
  WHERE t.id = p_team_id;

  -- Get meeting content samples (decisions, action items, discussions)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'file_name', file_name,
      'content', LEFT(content, 1500),
      'date', created_at
    )
  ), '[]'::jsonb) INTO v_meeting_content
  FROM (
    SELECT DISTINCT ON (google_file_id) file_name, content, created_at
    FROM document_chunks
    WHERE team_id = p_team_id
      AND doc_category = 'meetings'
    ORDER BY google_file_id, created_at DESC
    LIMIT 15
  ) meetings;

  -- Get strategy content (goals, plans, initiatives)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'file_name', file_name,
      'content', LEFT(content, 1500),
      'date', created_at
    )
  ), '[]'::jsonb) INTO v_strategy_content
  FROM (
    SELECT DISTINCT ON (google_file_id) file_name, content, created_at
    FROM document_chunks
    WHERE team_id = p_team_id
      AND doc_category = 'strategy'
    ORDER BY google_file_id, created_at DESC
    LIMIT 10
  ) strategy;

  -- Get financial content (budgets, reports, forecasts)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'file_name', file_name,
      'content', LEFT(content, 1500),
      'date', created_at
    )
  ), '[]'::jsonb) INTO v_financial_content
  FROM (
    SELECT DISTINCT ON (google_file_id) file_name, content, created_at
    FROM document_chunks
    WHERE team_id = p_team_id
      AND doc_category = 'financial'
    ORDER BY google_file_id, created_at DESC
    LIMIT 10
  ) financial;

  -- Get product content (product updates, roadmaps, features)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'file_name', file_name,
      'content', LEFT(content, 1500),
      'date', created_at
    )
  ), '[]'::jsonb) INTO v_product_content
  FROM (
    SELECT DISTINCT ON (google_file_id) file_name, content, created_at
    FROM document_chunks
    WHERE team_id = p_team_id
      AND doc_category = 'product'
    ORDER BY google_file_id, created_at DESC
    LIMIT 10
  ) product;

  -- Get operational content (processes, procedures, updates)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'file_name', file_name,
      'content', LEFT(content, 1500),
      'date', created_at
    )
  ), '[]'::jsonb) INTO v_operational_content
  FROM (
    SELECT DISTINCT ON (google_file_id) file_name, content, created_at
    FROM document_chunks
    WHERE team_id = p_team_id
      AND doc_category IN ('operational', 'operations')
    ORDER BY google_file_id, created_at DESC
    LIMIT 8
  ) operational;

  -- Get general/other content for broader context (sales, marketing, customer, people, etc.)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'file_name', file_name,
      'content', LEFT(content, 1000),
      'category', doc_category,
      'date', created_at
    )
  ), '[]'::jsonb) INTO v_general_content
  FROM (
    SELECT DISTINCT ON (google_file_id) file_name, content, doc_category, created_at
    FROM document_chunks
    WHERE team_id = p_team_id
      AND doc_category NOT IN ('meetings', 'strategy', 'financial', 'product', 'operational', 'operations')
    ORDER BY google_file_id, created_at DESC
    LIMIT 10
  ) general;

  -- Get team chat discussions (business context from conversations)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'user_name', user_name,
      'message', LEFT(message, 800),
      'date', created_at
    )
  ), '[]'::jsonb) INTO v_team_discussions
  FROM (
    SELECT user_name, message, created_at
    FROM astra_chats
    WHERE user_id IN (SELECT id FROM public.users WHERE team_id = p_team_id)
      AND mode = 'team'
      AND message_type = 'user'
      AND created_at >= now() - interval '14 days'
    ORDER BY created_at DESC
    LIMIT 20
  ) chats;

  -- Get recent AI reports generated (shows what team is focused on)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'prompt', LEFT(astra_prompt, 300),
      'response', LEFT(message, 1500),
      'date', created_at
    )
  ), '[]'::jsonb) INTO v_recent_reports
  FROM (
    SELECT astra_prompt, message, created_at
    FROM astra_chats
    WHERE user_id IN (SELECT id FROM public.users WHERE team_id = p_team_id)
      AND mode = 'reports'
      AND message_type = 'assistant'
      AND created_at >= now() - interval '14 days'
    ORDER BY created_at DESC
    LIMIT 10
  ) reports;

  -- Get category summary (what types of data the team has)
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
    GROUP BY doc_category
    ORDER BY cnt DESC
  ) cats;

  -- Get member info (who's on the team)
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

  -- Get previous snapshot for trend comparison
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

  -- Build final result focused on business content
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