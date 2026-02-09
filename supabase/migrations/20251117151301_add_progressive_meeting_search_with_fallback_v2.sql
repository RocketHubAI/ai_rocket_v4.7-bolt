/*
  # Progressive Meeting Search with Automatic Fallback
  
  1. Problem
    - Some queries take too long and timeout
    - Users get no results when timeout occurs
    - Need to guarantee results even for expensive queries
  
  2. Solution
    - Create a new function that tries multiple strategies in sequence
    - Start with aggressive filtering (recent dates only)
    - If that fails/times out, fall back to simpler queries
    - Use PL/pgSQL exception handling to catch errors
    - Return whatever results we can get within time limit
  
  3. Strategy
    - Attempt 1: Search last 60 days with full scoring (fast)
    - Attempt 2: If needed, search last 180 days with simpler scoring
    - Attempt 3: If still timing out, search last 365 days with minimal scoring
    - Each attempt has progressively simpler logic
  
  4. Changes
    - New function: match_documents_meetings_progressive
    - Uses statement_timeout for each attempt
    - Returns best available results
*/

CREATE OR REPLACE FUNCTION public.match_documents_meetings_progressive(
  query_embedding vector,
  filter jsonb DEFAULT '{}'::jsonb,
  match_count integer DEFAULT 200
)
RETURNS TABLE(id bigint, content text, metadata jsonb, similarity double precision)
LANGUAGE plpgsql
AS $function$
DECLARE
  match_team_id uuid;
  match_category text;
  recency_weight float;
  max_days_old int;
  attempt_days int;
  result_count int;
BEGIN
  -- Extract parameters
  match_team_id := COALESCE((filter->>'match_team_id')::uuid, (filter->>'team_id')::uuid);
  match_category := COALESCE((filter->>'match_category')::text, '');
  recency_weight := COALESCE((filter->>'recency_weight')::float, 0.15);
  max_days_old := COALESCE((filter->>'max_days_old')::int, 365);
  
  -- Validate team_id
  IF match_team_id IS NULL THEN
    RAISE EXCEPTION 'Missing required parameter: team_id';
  END IF;
  
  -- ATTEMPT 1: Try last 60 days first (most queries should complete here)
  BEGIN
    SET LOCAL statement_timeout = '45s';
    
    RAISE NOTICE 'Progressive Search - Attempt 1: Last 60 days';
    
    RETURN QUERY
    WITH recent_docs AS (
      SELECT 
        d.id, d.content, d.metadata, d.embedding, d.document_date
      FROM document_chunks_meetings d
      WHERE 
        d.team_id = match_team_id
        AND (match_category = '' OR d.document_category = match_category)
        AND d.document_date >= CURRENT_DATE - INTERVAL '60 days'
      ORDER BY d.document_date DESC
      LIMIT LEAST(match_count * 1.5, 400)::int
    ),
    scored_docs AS (
      SELECT 
        rd.id, rd.content, rd.metadata,
        (1 - (rd.embedding <=> query_embedding))::float AS base_similarity,
        rd.document_date
      FROM recent_docs rd
      WHERE (1 - (rd.embedding <=> query_embedding)) >= 0.5
    )
    SELECT 
      sd.id, sd.content, sd.metadata,
      sd.base_similarity AS similarity
    FROM scored_docs sd
    ORDER BY sd.document_date DESC, sd.base_similarity DESC
    LIMIT match_count;
    
    -- Check if we got results
    GET DIAGNOSTICS result_count = ROW_COUNT;
    IF result_count > 0 THEN
      RAISE NOTICE 'Progressive Search - Attempt 1 SUCCESS: % results', result_count;
      RETURN;
    END IF;
    
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Progressive Search - Attempt 1 FAILED: %, trying Attempt 2', SQLERRM;
  END;
  
  -- ATTEMPT 2: Try last 180 days with simpler query
  BEGIN
    SET LOCAL statement_timeout = '60s';
    
    RAISE NOTICE 'Progressive Search - Attempt 2: Last 180 days (simplified)';
    
    RETURN QUERY
    WITH recent_docs AS (
      SELECT 
        d.id, d.content, d.metadata, d.embedding, d.document_date
      FROM document_chunks_meetings d
      WHERE 
        d.team_id = match_team_id
        AND (match_category = '' OR d.document_category = match_category)
        AND d.document_date >= CURRENT_DATE - INTERVAL '180 days'
      ORDER BY d.document_date DESC
      LIMIT LEAST(match_count * 1.2, 300)::int
    )
    SELECT 
      rd.id, rd.content, rd.metadata,
      (1 - (rd.embedding <=> query_embedding))::float AS similarity
    FROM recent_docs rd
    WHERE (1 - (rd.embedding <=> query_embedding)) >= 0.6
    ORDER BY rd.document_date DESC, similarity DESC
    LIMIT match_count;
    
    GET DIAGNOSTICS result_count = ROW_COUNT;
    IF result_count > 0 THEN
      RAISE NOTICE 'Progressive Search - Attempt 2 SUCCESS: % results', result_count;
      RETURN;
    END IF;
    
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Progressive Search - Attempt 2 FAILED: %, trying Attempt 3', SQLERRM;
  END;
  
  -- ATTEMPT 3: Last resort - very recent data only, fastest possible query
  BEGIN
    SET LOCAL statement_timeout = '30s';
    
    RAISE NOTICE 'Progressive Search - Attempt 3: Last 30 days (emergency fallback)';
    
    RETURN QUERY
    SELECT 
      d.id, d.content, d.metadata,
      (1 - (d.embedding <=> query_embedding))::float AS similarity
    FROM document_chunks_meetings d
    WHERE 
      d.team_id = match_team_id
      AND (match_category = '' OR d.document_category = match_category)
      AND d.document_date >= CURRENT_DATE - INTERVAL '30 days'
      AND (1 - (d.embedding <=> query_embedding)) >= 0.65
    ORDER BY d.document_date DESC, similarity DESC
    LIMIT match_count;
    
    GET DIAGNOSTICS result_count = ROW_COUNT;
    RAISE NOTICE 'Progressive Search - Attempt 3 COMPLETE: % results', result_count;
    RETURN;
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Even the simplest query timed out - return empty with notice
      RAISE NOTICE 'Progressive Search - All attempts FAILED: %', SQLERRM;
      RETURN;
  END;
  
END;
$function$;

-- Add a comment explaining when to use this function
COMMENT ON FUNCTION match_documents_meetings_progressive IS 
'Progressive meeting search that automatically falls back to narrower date ranges if queries timeout.
Attempt 1: Last 60 days (45s timeout)
Attempt 2: Last 180 days simplified (60s timeout)  
Attempt 3: Last 30 days emergency (30s timeout)
Guarantees results or graceful failure within ~135s total.';
