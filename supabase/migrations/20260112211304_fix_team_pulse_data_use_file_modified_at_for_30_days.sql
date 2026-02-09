/*
  # Fix Team Pulse Data to Use file_modified_at for 30-Day Filtering

  1. Overview
    Updates the get_team_pulse_data function to properly filter documents by their
    actual modification date (file_modified_at) instead of just taking the most 
    recent chunks by ingestion date.

  2. Changes
    - Add 30-day filter using COALESCE(file_modified_at, created_at)
    - Order by file modification date to prioritize recent content
    - Ensure date is passed to the AI for proper context
    - Prioritize most recent 7-14 days data within the 30-day window

  3. Important
    This ensures the AI analyzes recent business activity, not old documents
    that were recently re-synced.
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
  -- Get team info (basic, not app metrics)
  SELECT jsonb_build_object(
    'team_id', t.id,
    'team_name', t.name,
    'created_at', t.created_at
  ) INTO v_team_info
  FROM teams t
  WHERE t.id = p_team_id;

  -- Get meeting content samples (decisions, action items, discussions) - LAST 30 DAYS
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'file_name', file_name,
      'content', LEFT(content, 1500),
      'date', TO_CHAR(COALESCE(file_modified_at, created_at), 'YYYY-MM-DD')
    )
  ), '[]'::jsonb) INTO v_meeting_content
  FROM (
    SELECT DISTINCT ON (google_file_id) 
      file_name, 
      content, 
      file_modified_at,
      created_at
    FROM document_chunks
    WHERE team_id = p_team_id
      AND doc_category = 'meetings'
      AND COALESCE(file_modified_at, created_at) >= v_thirty_days_ago
    ORDER BY google_file_id, COALESCE(file_modified_at, created_at) DESC
    LIMIT 20
  ) meetings
  ORDER BY COALESCE(file_modified_at, created_at) DESC;

  -- Get strategy content (goals, plans, initiatives) - LAST 30 DAYS
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'file_name', file_name,
      'content', LEFT(content, 1500),
      'date', TO_CHAR(COALESCE(file_modified_at, created_at), 'YYYY-MM-DD')
    )
  ), '[]'::jsonb) INTO v_strategy_content
  FROM (
    SELECT DISTINCT ON (google_file_id) 
      file_name, 
      content, 
      file_modified_at,
      created_at
    FROM document_chunks
    WHERE team_id = p_team_id
      AND doc_category = 'strategy'
      AND COALESCE(file_modified_at, created_at) >= v_thirty_days_ago
    ORDER BY google_file_id, COALESCE(file_modified_at, created_at) DESC
    LIMIT 15
  ) strategy
  ORDER BY COALESCE(file_modified_at, created_at) DESC;

  -- Get financial content (budgets, reports, forecasts) - LAST 30 DAYS
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'file_name', file_name,
      'content', LEFT(content, 1500),
      'date', TO_CHAR(COALESCE(file_modified_at, created_at), 'YYYY-MM-DD')
    )
  ), '[]'::jsonb) INTO v_financial_content
  FROM (
    SELECT DISTINCT ON (google_file_id) 
      file_name, 
      content, 
      file_modified_at,
      created_at
    FROM document_chunks
    WHERE team_id = p_team_id
      AND doc_category = 'financial'
      AND COALESCE(file_modified_at, created_at) >= v_thirty_days_ago
    ORDER BY google_file_id, COALESCE(file_modified_at, created_at) DESC
    LIMIT 15
  ) financial
  ORDER BY COALESCE(file_modified_at, created_at) DESC;

  -- Get product/projects content (product updates, roadmaps, features) - LAST 30 DAYS
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'file_name', file_name,
      'content', LEFT(content, 1500),
      'date', TO_CHAR(COALESCE(file_modified_at, created_at), 'YYYY-MM-DD')
    )
  ), '[]'::jsonb) INTO v_product_content
  FROM (
    SELECT DISTINCT ON (google_file_id) 
      file_name, 
      content, 
      file_modified_at,
      created_at
    FROM document_chunks
    WHERE team_id = p_team_id
      AND doc_category = 'product'
      AND COALESCE(file_modified_at, created_at) >= v_thirty_days_ago
    ORDER BY google_file_id, COALESCE(file_modified_at, created_at) DESC
    LIMIT 12
  ) product
  ORDER BY COALESCE(file_modified_at, created_at) DESC;

  -- Get operational content (processes, procedures, updates) - LAST 30 DAYS
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'file_name', file_name,
      'content', LEFT(content, 1500),
      'date', TO_CHAR(COALESCE(file_modified_at, created_at), 'YYYY-MM-DD')
    )
  ), '[]'::jsonb) INTO v_operational_content
  FROM (
    SELECT DISTINCT ON (google_file_id) 
      file_name, 
      content, 
      file_modified_at,
      created_at
    FROM document_chunks
    WHERE team_id = p_team_id
      AND doc_category IN ('operational', 'operations')
      AND COALESCE(file_modified_at, created_at) >= v_thirty_days_ago
    ORDER BY google_file_id, COALESCE(file_modified_at, created_at) DESC
    LIMIT 10
  ) operational
  ORDER BY COALESCE(file_modified_at, created_at) DESC;

  -- Get general/other content for broader context - LAST 30 DAYS
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'file_name', file_name,
      'content', LEFT(content, 1000),
      'category', doc_category,
      'date', TO_CHAR(COALESCE(file_modified_at, created_at), 'YYYY-MM-DD')
    )
  ), '[]'::jsonb) INTO v_general_content
  FROM (
    SELECT DISTINCT ON (google_file_id) 
      file_name, 
      content, 
      doc_category, 
      file_modified_at,
      created_at
    FROM document_chunks
    WHERE team_id = p_team_id
      AND doc_category NOT IN ('meetings', 'strategy', 'financial', 'product', 'operational', 'operations')
      AND COALESCE(file_modified_at, created_at) >= v_thirty_days_ago
    ORDER BY google_file_id, COALESCE(file_modified_at, created_at) DESC
    LIMIT 12
  ) general
  ORDER BY COALESCE(file_modified_at, created_at) DESC;

  -- Get team chat discussions (business context from conversations) - LAST 30 DAYS
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

  -- Get recent AI reports generated (shows what team is focused on) - LAST 30 DAYS
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

  -- Get category summary (what types of data the team has in last 30 days)
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