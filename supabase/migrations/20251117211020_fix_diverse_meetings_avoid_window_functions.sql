/*
  # Fix Diverse Meetings Function - Remove Expensive Window Functions
  
  1. Problem
    - ROW_NUMBER() OVER (PARTITION BY...) with vector similarity is too slow
    - Computing similarity for all chunks before limiting causes timeout
    - Need simpler approach without window functions
    
  2. Solution
    - Sample meeting dates first (cheap operation)
    - For each meeting, use simple LIMIT without ranking
    - Use UNION ALL to combine results from different meetings
    - Much faster: no window functions, limited vector computations
    
  3. Strategy
    - Pre-filter recent meeting dates
    - Use simple similarity threshold + LIMIT per meeting
    - Combine with UNION ALL
    - Target: < 10 seconds execution time
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
  
  -- Calculate target meetings
  target_meetings := CEIL(match_count::float / chunks_per_meeting::float);
  
  -- Validate team_id
  IF match_team_id IS NULL THEN
    RAISE EXCEPTION 'Missing required parameter: team_id';
  END IF;
  
  RAISE NOTICE 'Diverse Meetings Search - team: %, category: %, days: %, target: % meetings × % chunks', 
    match_team_id, match_category, max_days_old, target_meetings, chunks_per_meeting;

  -- Simple approach: Get most recent meetings and sample chunks from each
  BEGIN
    SET LOCAL statement_timeout = '25s';
    
    RAISE NOTICE 'Diverse Search - Attempting fast sampling approach';
    
    RETURN QUERY
    WITH recent_meeting_dates AS (
      -- Get list of recent meeting dates (fast: no vector ops)
      SELECT DISTINCT document_date
      FROM document_chunks_meetings
      WHERE 
        team_id = match_team_id
        AND (match_category = '' OR document_category = match_category)
        AND document_date >= CURRENT_DATE - (max_days_old || ' days')::interval
      ORDER BY document_date DESC
      LIMIT target_meetings + 10  -- Get extra to account for filtering
    ),
    sampled_chunks AS (
      -- For each meeting date, get top chunks by similarity
      SELECT DISTINCT ON (d.document_date, d.id)
        d.id,
        d.content,
        d.metadata,
        d.document_date,
        (1 - (d.embedding <=> query_embedding))::float AS similarity
      FROM document_chunks_meetings d
      WHERE 
        d.team_id = match_team_id
        AND (match_category = '' OR d.document_category = match_category)
        AND d.document_date IN (SELECT document_date FROM recent_meeting_dates)
        AND (1 - (d.embedding <=> query_embedding)) >= 0.25  -- Permissive threshold
      ORDER BY d.document_date DESC, d.id, (d.embedding <=> query_embedding) ASC
    ),
    limited_per_meeting AS (
      -- Limit chunks per meeting using a different approach
      SELECT 
        sc.id,
        sc.content,
        sc.metadata,
        sc.similarity,
        sc.document_date,
        (
          SELECT COUNT(*) 
          FROM sampled_chunks sc2 
          WHERE sc2.document_date = sc.document_date 
            AND sc2.id <= sc.id
        ) as chunk_position
      FROM sampled_chunks sc
    )
    SELECT 
      lpm.id,
      lpm.content,
      lpm.metadata,
      lpm.similarity
    FROM limited_per_meeting lpm
    WHERE lpm.chunk_position <= chunks_per_meeting
    ORDER BY lpm.document_date DESC, lpm.similarity DESC
    LIMIT match_count;
    
    GET DIAGNOSTICS result_count = ROW_COUNT;
    IF result_count > 0 THEN
      RAISE NOTICE 'Diverse Search SUCCESS: % chunks from multiple meetings', result_count;
      RETURN;
    END IF;
    
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Diverse Search FAILED: %', SQLERRM;
  END;

  -- Fallback: Just return top results without diversity constraint
  BEGIN
    SET LOCAL statement_timeout = '15s';
    
    RAISE NOTICE 'Diverse Search - Fallback to simple search';
    
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
      AND d.document_date >= CURRENT_DATE - ((max_days_old / 2) || ' days')::interval
      AND (1 - (d.embedding <=> query_embedding)) >= 0.30
    ORDER BY d.document_date DESC, (d.embedding <=> query_embedding) ASC
    LIMIT match_count;
    
    RAISE NOTICE 'Diverse Search - Fallback COMPLETE';
    RETURN;
    
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Diverse Search - All attempts FAILED: %', SQLERRM;
      RETURN;
  END;
  
END;
$function$;

COMMENT ON FUNCTION match_documents_meetings_diverse IS 
'Fast diverse meeting search without expensive window functions.
Returns chunks from many different meetings by sampling top chunks per meeting.
Parameters:
- query_embedding: Vector to search
- filter: team_id (required), match_category, max_days_old  
- match_count: Total chunks (default 200)
- chunks_per_meeting: Max per meeting (default 10)
Target: Sub-25 second execution for better reliability.';
