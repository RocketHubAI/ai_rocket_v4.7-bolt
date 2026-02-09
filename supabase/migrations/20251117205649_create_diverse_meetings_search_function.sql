/*
  # Create Diverse Meetings Search Function
  
  1. Problem
    - Current functions return many chunks from just 2-3 meetings
    - Query "recent activities" returns only the 2 most recent meetings
    - Need to return chunks from MANY different meetings (10-20+)
    
  2. Solution
    - Sample chunks from MANY different meeting dates
    - Limit chunks per meeting date (e.g., 10-20 chunks per meeting)
    - Use DISTINCT ON (document_date) with ROW_NUMBER to distribute evenly
    - Still maintain relevance through similarity scoring
    
  3. Strategy
    - Find top matching meetings (by document_date)
    - Take limited chunks from each meeting
    - Result: 20 meetings × 10 chunks = 200 total chunks from diverse sources
*/

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
  max_meetings int;
BEGIN
  -- Extract parameters
  match_team_id := COALESCE((filter->>'match_team_id')::uuid, (filter->>'team_id')::uuid);
  match_category := COALESCE((filter->>'match_category')::text, '');
  max_days_old := COALESCE((filter->>'max_days_old')::int, 180);
  
  -- Calculate how many meetings we need to reach match_count
  max_meetings := CEIL(match_count::float / chunks_per_meeting::float);
  
  -- Validate team_id
  IF match_team_id IS NULL THEN
    RAISE EXCEPTION 'Missing required parameter: team_id';
  END IF;
  
  RAISE NOTICE 'Diverse Meetings Search - team: %, category: %, days: %, target: % meetings with % chunks each', 
    match_team_id, match_category, max_days_old, max_meetings, chunks_per_meeting;

  -- ATTEMPT 1: Get diverse meetings with chunk distribution (30s timeout)
  BEGIN
    SET LOCAL statement_timeout = '30s';
    
    RAISE NOTICE 'Diverse Search - Attempt 1: Selecting from top % meetings', max_meetings;
    
    RETURN QUERY
    WITH recent_meetings AS (
      -- Get recent meeting dates
      SELECT DISTINCT document_date
      FROM document_chunks_meetings d
      WHERE 
        d.team_id = match_team_id
        AND (match_category = '' OR d.document_category = match_category)
        AND d.document_date >= CURRENT_DATE - (max_days_old || ' days')::interval
      ORDER BY document_date DESC
      LIMIT max_meetings * 3  -- Get extra meetings to ensure enough chunks after filtering
    ),
    ranked_chunks AS (
      -- For each meeting, rank chunks by similarity
      SELECT 
        d.id,
        d.content,
        d.metadata,
        d.document_date,
        (1 - (d.embedding <=> query_embedding))::float AS similarity,
        ROW_NUMBER() OVER (
          PARTITION BY d.document_date 
          ORDER BY (d.embedding <=> query_embedding) ASC
        ) as chunk_rank
      FROM document_chunks_meetings d
      INNER JOIN recent_meetings rm ON d.document_date = rm.document_date
      WHERE 
        d.team_id = match_team_id
        AND (match_category = '' OR d.document_category = match_category)
        AND (1 - (d.embedding <=> query_embedding)) >= 0.30  -- Moderate threshold
    )
    -- Take limited chunks from each meeting
    SELECT 
      rc.id,
      rc.content,
      rc.metadata,
      rc.similarity
    FROM ranked_chunks rc
    WHERE rc.chunk_rank <= chunks_per_meeting  -- Limit chunks per meeting
    ORDER BY rc.document_date DESC, rc.similarity DESC
    LIMIT match_count;
    
    GET DIAGNOSTICS result_count = ROW_COUNT;
    IF result_count > 0 THEN
      RAISE NOTICE 'Diverse Search - Attempt 1 SUCCESS: % chunks returned', result_count;
      RETURN;
    END IF;
    
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Diverse Search - Attempt 1 FAILED: %', SQLERRM;
  END;

  -- ATTEMPT 2: More permissive with fewer meetings (20s timeout)
  BEGIN
    SET LOCAL statement_timeout = '20s';
    max_meetings := max_meetings / 2;
    
    RAISE NOTICE 'Diverse Search - Attempt 2: Fallback with % meetings', max_meetings;
    
    RETURN QUERY
    WITH recent_meetings AS (
      SELECT DISTINCT document_date
      FROM document_chunks_meetings d
      WHERE 
        d.team_id = match_team_id
        AND (match_category = '' OR d.document_category = match_category)
        AND d.document_date >= CURRENT_DATE - ((max_days_old / 2) || ' days')::interval
      ORDER BY document_date DESC
      LIMIT max_meetings * 2
    ),
    ranked_chunks AS (
      SELECT 
        d.id,
        d.content,
        d.metadata,
        d.document_date,
        (1 - (d.embedding <=> query_embedding))::float AS similarity,
        ROW_NUMBER() OVER (
          PARTITION BY d.document_date 
          ORDER BY (d.embedding <=> query_embedding) ASC
        ) as chunk_rank
      FROM document_chunks_meetings d
      INNER JOIN recent_meetings rm ON d.document_date = rm.document_date
      WHERE 
        d.team_id = match_team_id
        AND (match_category = '' OR d.document_category = match_category)
        AND (1 - (d.embedding <=> query_embedding)) >= 0.25  -- Lower threshold
    )
    SELECT 
      rc.id,
      rc.content,
      rc.metadata,
      rc.similarity
    FROM ranked_chunks rc
    WHERE rc.chunk_rank <= (chunks_per_meeting * 2)  -- More chunks per meeting
    ORDER BY rc.document_date DESC, rc.similarity DESC
    LIMIT match_count;
    
    GET DIAGNOSTICS result_count = ROW_COUNT;
    RAISE NOTICE 'Diverse Search - Attempt 2 COMPLETE: % chunks returned', result_count;
    RETURN;
    
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Diverse Search - All attempts FAILED: %', SQLERRM;
      RETURN;
  END;
  
END;
$function$;

COMMENT ON FUNCTION match_documents_meetings_diverse IS 
'Diverse meeting search that returns chunks from MANY different meetings.
Instead of 200 chunks from 2 meetings, returns chunks from 20+ meetings.
Parameters:
- query_embedding: Vector to search
- filter: team_id (required), match_category, max_days_old
- match_count: Total chunks to return (default 200)
- chunks_per_meeting: Max chunks per meeting date (default 10)
Result: Better source diversity for "recent activities" type queries.';
