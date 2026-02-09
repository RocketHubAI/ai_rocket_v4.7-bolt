/*
  # Create get_team_dashboard_data Function

  1. Overview
    This function aggregates all team data needed for AI-powered daily dashboard generation.
    It focuses on extracting data that can contain goals, targets, metrics, mission statements,
    and core values information.

  2. Data Sources
    - Strategy documents (mission, vision, goals, OKRs)
    - Meeting notes and transcripts (goal discussions, progress updates)
    - Financial documents (budget targets, revenue goals)
    - Project documents (milestones, deliverables)
    - Team discussions from Astra chats
    - Recent AI-generated reports
    - Previous dashboard snapshot for trend comparison

  3. Returns
    JSONB object containing categorized content for AI analysis
*/

CREATE OR REPLACE FUNCTION get_team_dashboard_data(p_team_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
  v_team_info jsonb;
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
  -- Get team info
  SELECT jsonb_build_object(
    'team_id', t.id,
    'team_name', t.name,
    'created_at', t.created_at
  ) INTO v_team_info
  FROM teams t
  WHERE t.id = p_team_id;

  -- Strategy content (primary source for mission, vision, goals, OKRs)
  -- Get more content with larger text excerpts for better goal detection
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

  -- Meeting content (key source for goal discussions, progress updates, blockers)
  -- Prioritize recent meetings as they contain current status
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

  -- Financial content (budget targets, revenue goals, financial metrics)
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

  -- Project/Product content (milestones, deliverables, project goals)
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
      AND doc_category IN ('product', 'projects')
      AND COALESCE(file_modified_at, created_at) >= v_thirty_days_ago
    ORDER BY google_file_id, COALESCE(file_modified_at, created_at) DESC
    LIMIT 15
  ) projects;

  -- Operational content (processes, SOPs that may contain targets)
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

  -- General content (catch-all for other categories)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'file_name', file_name,
      'content', LEFT(content, 1200),
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
      AND doc_category NOT IN ('meetings', 'strategy', 'financial', 'product', 'projects', 'operational', 'operations')
      AND COALESCE(file_modified_at, created_at) >= v_thirty_days_ago
    ORDER BY google_file_id, COALESCE(file_modified_at, created_at) DESC
    LIMIT 15
  ) general;

  -- Team discussions from Astra chat (team mode)
  -- May contain goal discussions, blockers, progress updates
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

  -- Recent AI-generated reports (may contain synthesized goals/metrics)
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

  -- Category summary for data richness assessment
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'category', doc_category,
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

  -- Member info
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

  -- Previous dashboard snapshot for trend comparison
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

  -- Build final result
  v_result := jsonb_build_object(
    'team_info', COALESCE(v_team_info, '{}'::jsonb),
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