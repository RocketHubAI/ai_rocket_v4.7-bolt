/*
  # Progressive Single Category Search
  
  1. Purpose
    - Add progressive fallback to single category searches
    - Ensures strict mode queries (specific meeting types) never timeout
    - Preserves all functionality of match_documents_single_category
  
  2. Strategy
    - Attempt 1: Full requested range (60s)
    - Attempt 2: 50% of requested range (60s)
    - Attempt 3: Emergency 30 days (30s)
  
  3. Changes
    - New function: match_documents_single_category_progressive
    - Drop-in replacement for match_documents_single_category
*/

CREATE OR REPLACE FUNCTION public.match_documents_single_category_progressive(
  query_embedding vector,
  filter jsonb DEFAULT '{}'::jsonb,
  match_count integer DEFAULT 200
)
RETURNS TABLE(id bigint, content text, metadata jsonb, similarity double precision)
LANGUAGE plpgsql
AS $function$
DECLARE
  match_category text;
  match_team_id uuid;
  recency_weight float;
  max_days_old int;
  attempt_days int;
  result_count int;
BEGIN
  -- Extract parameters
  match_category := COALESCE((filter->>'match_category')::text, '');
  match_team_id := COALESCE((filter->>'match_team_id')::uuid, (filter->>'team_id')::uuid);
  recency_weight := COALESCE((filter->>'recency_weight')::float, 0.25);
  max_days_old := COALESCE((filter->>'max_days_old')::int, 365);
  
  -- Validate team_id
  IF match_team_id IS NULL THEN
    RAISE EXCEPTION 'Missing required parameter: team_id';
  END IF;
  
  -- ATTEMPT 1: Full requested range
  BEGIN
    SET LOCAL statement_timeout = '60s';
    
    attempt_days := max_days_old;
    RAISE NOTICE 'Single Category Progressive - Attempt 1: Last % days for category "%"', attempt_days, match_category;
    
    RETURN QUERY
    WITH filtered_docs AS (
      SELECT 
        d.id, d.content, d.metadata, d.embedding, d.document_date
      FROM document_chunks_meetings d
      WHERE 
        d.team_id = match_team_id
        AND (match_category = '' OR d.document_category = match_category)
        AND d.document_date >= CURRENT_DATE - (attempt_days || ' days')::interval
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
      sd.id, sd.content, sd.metadata, sd.base_similarity AS similarity
    FROM scored_docs sd
    ORDER BY sd.document_date DESC, sd.base_similarity DESC
    LIMIT match_count;
    
    GET DIAGNOSTICS result_count = ROW_COUNT;
    IF result_count > 0 THEN
      RAISE NOTICE 'Single Category Progressive - Attempt 1 SUCCESS: % results', result_count;
      RETURN;
    END IF;
    
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Single Category Progressive - Attempt 1 FAILED: %, trying Attempt 2', SQLERRM;
  END;
  
  -- ATTEMPT 2: 50% of requested range
  BEGIN
    SET LOCAL statement_timeout = '60s';
    
    attempt_days := GREATEST(max_days_old / 2, 60)::int;
    RAISE NOTICE 'Single Category Progressive - Attempt 2: Last % days (50%% reduction)', attempt_days;
    
    RETURN QUERY
    WITH filtered_docs AS (
      SELECT 
        d.id, d.content, d.metadata, d.embedding, d.document_date
      FROM document_chunks_meetings d
      WHERE 
        d.team_id = match_team_id
        AND (match_category = '' OR d.document_category = match_category)
        AND d.document_date >= CURRENT_DATE - (attempt_days || ' days')::interval
      ORDER BY d.document_date DESC
      LIMIT LEAST(match_count * 1.3, 400)::int
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
      sd.id, sd.content, sd.metadata, sd.base_similarity AS similarity
    FROM scored_docs sd
    ORDER BY sd.document_date DESC, sd.base_similarity DESC
    LIMIT match_count;
    
    GET DIAGNOSTICS result_count = ROW_COUNT;
    IF result_count > 0 THEN
      RAISE NOTICE 'Single Category Progressive - Attempt 2 SUCCESS: % results', result_count;
      RETURN;
    END IF;
    
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Single Category Progressive - Attempt 2 FAILED: %, trying Attempt 3', SQLERRM;
  END;
  
  -- ATTEMPT 3: Emergency 30 days
  BEGIN
    SET LOCAL statement_timeout = '30s';
    
    RAISE NOTICE 'Single Category Progressive - Attempt 3: Last 30 days (emergency)';
    
    RETURN QUERY
    SELECT 
      d.id, d.content, d.metadata,
      (1 - (d.embedding <=> query_embedding))::float AS similarity
    FROM document_chunks_meetings d
    WHERE 
      d.team_id = match_team_id
      AND (match_category = '' OR d.document_category = match_category)
      AND d.document_date >= CURRENT_DATE - INTERVAL '30 days'
      AND (1 - (d.embedding <=> query_embedding)) >= 0.6
    ORDER BY d.document_date DESC, similarity DESC
    LIMIT match_count;
    
    GET DIAGNOSTICS result_count = ROW_COUNT;
    RAISE NOTICE 'Single Category Progressive - Attempt 3 COMPLETE: % results', result_count;
    RETURN;
    
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Single Category Progressive - All attempts FAILED: %', SQLERRM;
      RETURN;
  END;
  
END;
$function$;

COMMENT ON FUNCTION match_documents_single_category_progressive IS 
'Progressive single-category search with fallback for strict mode queries.
Used when users request specific meeting types (L10, Weekly Leadership, etc.).
Preserves all features of match_documents_single_category with added reliability.
Attempt 1: Full requested range (60s)
Attempt 2: 50% of range (60s)
Attempt 3: 30 days emergency (30s)';
