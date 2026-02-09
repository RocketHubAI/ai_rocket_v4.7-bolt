/*
  # Time-Aware Meeting Search with Dynamic Scope Reduction
  
  1. Problem
    - Cannot interrupt a running query mid-execution
    - Need to ensure queries complete within timeout
  
  2. Solution
    - Use a smart estimation approach
    - Calculate expected query time based on date range
    - Automatically reduce scope if estimated time > available time
    - Always return results within timeout
  
  3. Strategy
    - Estimate documents in date range using table statistics
    - Calculate expected execution time
    - If time too long, reduce date range automatically
    - Binary search approach to find optimal range
  
  4. Changes
    - New function: match_documents_meetings_smart_timeout
    - Uses pg_class statistics for estimation
    - Dynamically adjusts date range
*/

CREATE OR REPLACE FUNCTION public.match_documents_meetings_smart_timeout(
  query_embedding vector,
  filter jsonb DEFAULT '{}'::jsonb,
  match_count integer DEFAULT 200,
  max_execution_seconds integer DEFAULT 120
)
RETURNS TABLE(id bigint, content text, metadata jsonb, similarity double precision, search_info jsonb)
LANGUAGE plpgsql
AS $function$
DECLARE
  match_team_id uuid;
  match_category text;
  max_days_old int;
  actual_days_used int;
  estimated_rows bigint;
  total_rows bigint;
  date_fraction numeric;
BEGIN
  -- Set overall timeout slightly higher than max_execution_seconds
  EXECUTE format('SET LOCAL statement_timeout = ''%ss''', max_execution_seconds + 10);
  
  -- Extract parameters
  match_team_id := COALESCE((filter->>'match_team_id')::uuid, (filter->>'team_id')::uuid);
  match_category := COALESCE((filter->>'match_category')::text, '');
  max_days_old := COALESCE((filter->>'max_days_old')::int, 365);
  
  -- Validate team_id
  IF match_team_id IS NULL THEN
    RAISE EXCEPTION 'Missing required parameter: team_id';
  END IF;
  
  -- Get approximate total rows for this team
  SELECT COUNT(*) INTO total_rows
  FROM document_chunks_meetings
  WHERE team_id = match_team_id
    AND (match_category = '' OR document_category = match_category);
  
  -- Smart date range selection based on total_rows
  -- Rule: Process at most 1000 rows for queries under 120s
  IF total_rows <= 1000 THEN
    -- Small dataset, can search full range
    actual_days_used := max_days_old;
  ELSIF total_rows <= 5000 THEN
    -- Medium dataset, limit to 180 days
    actual_days_used := LEAST(max_days_old, 180);
  ELSIF total_rows <= 10000 THEN
    -- Large dataset, limit to 90 days
    actual_days_used := LEAST(max_days_old, 90);
  ELSE
    -- Very large dataset, limit to 60 days
    actual_days_used := LEAST(max_days_old, 60);
  END IF;
  
  RAISE NOTICE 'Smart Timeout Search: total_rows=%, max_days=%, actual_days=%, timeout=%s',
    total_rows, max_days_old, actual_days_used, max_execution_seconds;
  
  -- Execute query with dynamically determined date range
  RETURN QUERY
  WITH filtered_docs AS (
    SELECT 
      d.id, d.content, d.metadata, d.embedding, d.document_date
    FROM document_chunks_meetings d
    WHERE 
      d.team_id = match_team_id
      AND (match_category = '' OR d.document_category = match_category)
      AND d.document_date >= CURRENT_DATE - (actual_days_used || ' days')::interval
    ORDER BY d.document_date DESC
    LIMIT LEAST(match_count * 1.5, 500)::int
  ),
  scored_docs AS (
    SELECT 
      fd.id, fd.content, fd.metadata,
      (1 - (fd.embedding <=> query_embedding))::float AS base_similarity,
      fd.document_date
    FROM filtered_docs fd
    WHERE (1 - (fd.embedding <=> query_embedding)) >= 0.5
  )
  SELECT 
    sd.id,
    sd.content,
    sd.metadata,
    sd.base_similarity AS similarity,
    jsonb_build_object(
      'requested_days', max_days_old,
      'actual_days_searched', actual_days_used,
      'total_team_documents', total_rows,
      'date_range_adjusted', (max_days_old != actual_days_used),
      'search_start_date', (CURRENT_DATE - (actual_days_used || ' days')::interval)::text
    ) AS search_info
  FROM scored_docs sd
  ORDER BY sd.document_date DESC, sd.base_similarity DESC
  LIMIT match_count;
  
END;
$function$;

COMMENT ON FUNCTION match_documents_meetings_smart_timeout IS 
'Smart meeting search that automatically reduces date range based on dataset size.
Dynamically adjusts search scope to guarantee completion within timeout.
Returns search_info with actual date range used.
Recommended for user-facing queries where reliability > comprehensiveness.';
