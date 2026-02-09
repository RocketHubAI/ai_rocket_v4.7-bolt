/*
  # Ultra-Simple Diverse Meetings Search
  
  1. Problem
    - Window functions and correlated subqueries timeout
    - Need the simplest possible approach
    
  2. Solution
    - Get recent meeting dates (no vector ops)
    - Use LATERAL join to get top N chunks per meeting
    - No window functions, no subqueries in WHERE
    - PostgreSQL optimizes LATERAL joins well
    
  3. Performance
    - LATERAL limits chunks before computing similarity
    - Should complete in < 15 seconds
*/

DROP FUNCTION IF EXISTS public.match_documents_meetings_diverse(vector, jsonb, integer, integer);

CREATE OR REPLACE FUNCTION public.match_documents_meetings_diverse(
  query_embedding vector,
  filter jsonb DEFAULT '{}'::jsonb,
  match_count integer DEFAULT 200,
  chunks_per_meeting integer DEFAULT 10
)
RETURNS TABLE(id bigint, content text, metadata jsonb, similarity double precision)
LANGUAGE plpgsql
AS $function$
DECLARE
  match_team_id uuid;
  match_category text;
  max_days_old int;
  result_count int;
  target_meetings int;
BEGIN
  -- Extract parameters
  match_team_id := COALESCE((filter->>'match_team_id')::uuid, (filter->>'team_id')::uuid);
  match_category := COALESCE((filter->>'match_category')::text, '');
  max_days_old := COALESCE((filter->>'max_days_old')::int, 180);
  target_meetings := CEIL(match_count::float / chunks_per_meeting::float);
  
  IF match_team_id IS NULL THEN
    RAISE EXCEPTION 'Missing required parameter: team_id';
  END IF;
  
  RAISE NOTICE 'Diverse Meetings (LATERAL) - team: %, target: % meetings × % chunks', 
    match_team_id, target_meetings, chunks_per_meeting;

  BEGIN
    SET LOCAL statement_timeout = '20s';
    
    RETURN QUERY
    WITH meeting_dates AS (
      -- Get distinct meeting dates (very fast, no vector ops)
      SELECT DISTINCT document_date
      FROM document_chunks_meetings
      WHERE 
        team_id = match_team_id
        AND (match_category = '' OR document_category = match_category)
        AND document_date >= CURRENT_DATE - (max_days_old || ' days')::interval
      ORDER BY document_date DESC
      LIMIT target_meetings + 5
    )
    SELECT 
      chunks.id,
      chunks.content,
      chunks.metadata,
      (1 - (chunks.embedding <=> query_embedding))::float AS similarity
    FROM meeting_dates md
    CROSS JOIN LATERAL (
      -- For each meeting date, get top chunks
      SELECT id, content, metadata, embedding
      FROM document_chunks_meetings
      WHERE 
        team_id = match_team_id
        AND document_date = md.document_date
        AND (match_category = '' OR document_category = match_category)
      ORDER BY (embedding <=> query_embedding) ASC
      LIMIT chunks_per_meeting
    ) chunks
    WHERE (1 - (chunks.embedding <=> query_embedding)) >= 0.25
    ORDER BY md.document_date DESC
    LIMIT match_count;
    
    GET DIAGNOSTICS result_count = ROW_COUNT;
    RAISE NOTICE 'Diverse LATERAL SUCCESS: % chunks', result_count;
    RETURN;
    
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Diverse LATERAL FAILED: %', SQLERRM;
  END;

  -- Emergency fallback
  BEGIN
    SET LOCAL statement_timeout = '10s';
    
    RAISE NOTICE 'Emergency fallback to simple query';
    
    RETURN QUERY
    SELECT 
      d.id,
      d.content,
      d.metadata,
      (1 - (d.embedding <=> query_embedding))::float AS similarity
    FROM document_chunks_meetings d
    WHERE 
      d.team_id = match_team_id
      AND (match_category = '' OR d.document_category = match_category)
      AND d.document_date >= CURRENT_DATE - INTERVAL '60 days'
      AND (1 - (d.embedding <=> query_embedding)) >= 0.35
    ORDER BY d.document_date DESC
    LIMIT match_count;
    
    RAISE NOTICE 'Emergency fallback COMPLETE';
    
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'All attempts FAILED: %', SQLERRM;
      RETURN;
  END;
  
END;
$function$;

COMMENT ON FUNCTION match_documents_meetings_diverse IS 
'Ultra-simple diverse meetings search using LATERAL joins.
Avoids expensive window functions for better performance.
Target: 20 seconds max, returns chunks from 20+ meetings.';
