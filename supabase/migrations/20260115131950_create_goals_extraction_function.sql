/*
  # Create Specialized Function for Goals/Targets Extraction

  1. Purpose
    - Returns documents specifically relevant for goals, rocks, OKRs, targets
    - Prioritizes quarterly planning, L10 meetings, and strategy documents
    - Looks for goal-related keywords in content
    - Returns recent meeting notes for status updates

  2. Logic
    - First priority: Documents with 'rock', 'okr', 'goal', 'quarterly' in filename
    - Second priority: Recent L10/meeting notes (last 30 days)
    - Third priority: Strategy docs with goal-related content
    - Aggregates chunks for complete context
*/

CREATE OR REPLACE FUNCTION get_goals_context(p_team_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_goal_documents jsonb;
  v_recent_meetings jsonb;
  v_quarterly_documents jsonb;
  v_thirty_days_ago timestamptz := now() - interval '30 days';
BEGIN
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'file_name', file_name,
      'content', full_content,
      'date', last_modified,
      'priority', 1,
      'source', 'goal_filename'
    )
  ), '[]'::jsonb) INTO v_goal_documents
  FROM (
    SELECT 
      file_name,
      STRING_AGG(content, E'\n\n' ORDER BY chunk_index) as full_content,
      MAX(COALESCE(file_modified_at, created_at))::date as last_modified
    FROM document_chunks
    WHERE team_id = p_team_id
      AND (
        file_name ILIKE '%rock%'
        OR file_name ILIKE '%okr%'
        OR file_name ILIKE '%goal%'
        OR file_name ILIKE '%target%'
        OR file_name ILIKE '%quarterly%'
        OR file_name ILIKE '%scorecard%'
      )
    GROUP BY file_name, google_file_id
    ORDER BY MAX(COALESCE(file_modified_at, created_at)) DESC
    LIMIT 10
  ) goals;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'file_name', file_name,
      'content', LEFT(full_content, 3500),
      'date', last_modified,
      'priority', 2,
      'source', 'recent_meeting'
    )
  ), '[]'::jsonb) INTO v_recent_meetings
  FROM (
    SELECT 
      file_name,
      STRING_AGG(content, E'\n\n' ORDER BY chunk_index) as full_content,
      MAX(COALESCE(file_modified_at, created_at))::date as last_modified
    FROM document_chunks
    WHERE team_id = p_team_id
      AND doc_category = 'meetings'
      AND COALESCE(file_modified_at, created_at) >= v_thirty_days_ago
      AND (
        file_name ILIKE '%l10%'
        OR file_name ILIKE '%weekly%'
        OR file_name ILIKE '%quarterly%'
        OR content ILIKE '%rock%'
        OR content ILIKE '%on track%'
        OR content ILIKE '%at risk%'
        OR content ILIKE '%blocked%'
      )
    GROUP BY file_name, google_file_id
    ORDER BY MAX(COALESCE(file_modified_at, created_at)) DESC
    LIMIT 15
  ) meetings;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'file_name', file_name,
      'content', LEFT(full_content, 3000),
      'date', last_modified,
      'priority', 3,
      'source', 'strategy_goals'
    )
  ), '[]'::jsonb) INTO v_quarterly_documents
  FROM (
    SELECT 
      file_name,
      STRING_AGG(content, E'\n\n' ORDER BY chunk_index) as full_content,
      MAX(COALESCE(file_modified_at, created_at))::date as last_modified
    FROM document_chunks
    WHERE team_id = p_team_id
      AND doc_category IN ('strategy', 'product')
      AND (
        content ILIKE '%q1 %' OR content ILIKE '%q2 %' OR content ILIKE '%q3 %' OR content ILIKE '%q4 %'
        OR content ILIKE '%milestone%'
        OR content ILIKE '%deadline%'
        OR content ILIKE '%target%'
        OR content ILIKE '%kpi%'
        OR content ILIKE '%objective%'
      )
    GROUP BY file_name, google_file_id
    ORDER BY MAX(COALESCE(file_modified_at, created_at)) DESC
    LIMIT 8
  ) quarterly;

  RETURN jsonb_build_object(
    'goal_documents', v_goal_documents,
    'recent_meetings', v_recent_meetings,
    'quarterly_documents', v_quarterly_documents,
    'total_found', (
      jsonb_array_length(v_goal_documents) + 
      jsonb_array_length(v_recent_meetings) + 
      jsonb_array_length(v_quarterly_documents)
    )
  );
END;
$$;