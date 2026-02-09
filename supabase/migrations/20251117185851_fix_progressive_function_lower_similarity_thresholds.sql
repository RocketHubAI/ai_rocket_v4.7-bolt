/*
  # Lower Similarity Thresholds in Progressive Function

  1. Problem
    - Function executes successfully (no timeout)
    - But returns empty results for generic queries
    - Similarity thresholds (0.50, 0.55, 0.60) are too high
    - Generic queries like "recent activities" don't reach these thresholds

  2. Solution
    - Lower Attempt 1 threshold: 0.50 → 0.35 (much more permissive)
    - Lower Attempt 2 threshold: 0.55 → 0.40 (cast wider net)
    - Lower Attempt 3 threshold: 0.60 → 0.45 (emergency should be lenient)
    - This will return more results, prioritizing recall over precision

  3. Performance Impact
    - Pre-filtering still limits computation (400-1000 docs)
    - No timeout risk due to LIMIT before vector computation
    - Better user experience with more results
*/

DROP FUNCTION IF EXISTS public.match_documents_meetings_progressive(vector, jsonb, integer);

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
  
  RAISE NOTICE 'Progressive Search - team: %, category: %, max_days: %', 
    match_team_id, match_category, max_days_old;
  
  -- ATTEMPT 1: Try requested time range with generous pre-filter (35s timeout)
  BEGIN
    SET LOCAL statement_timeout = '35s';
    
    RAISE NOTICE 'Progressive Search - Attempt 1: Last % days with 1000 doc limit', max_days_old;
    
    RETURN QUERY
    WITH recent_docs AS (
      -- Pre-filter by date, limit BEFORE vector computation
      SELECT 
        d.id, d.content, d.metadata, d.embedding, d.document_date
      FROM document_chunks_meetings d
      WHERE 
        d.team_id = match_team_id
        AND (match_category = '' OR d.document_category = match_category)
        AND d.document_date >= CURRENT_DATE - (max_days_old || ' days')::interval
      ORDER BY d.document_date DESC
      LIMIT 1000
    ),
    scored_docs AS (
      SELECT 
        rd.id, rd.content, rd.metadata,
        (1 - (rd.embedding <=> query_embedding))::float AS base_similarity,
        rd.document_date
      FROM recent_docs rd
      WHERE (1 - (rd.embedding <=> query_embedding)) >= 0.35  -- ✅ LOWERED from 0.50
    )
    SELECT 
      sd.id, sd.content, sd.metadata,
      sd.base_similarity AS similarity
    FROM scored_docs sd
    ORDER BY sd.document_date DESC, sd.base_similarity DESC
    LIMIT match_count;
    
    GET DIAGNOSTICS result_count = ROW_COUNT;
    IF result_count > 0 THEN
      RAISE NOTICE 'Progressive Search - Attempt 1 SUCCESS: % results', result_count;
      RETURN;
    END IF;
    
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Progressive Search - Attempt 1 FAILED: %', SQLERRM;
  END;
  
  -- ATTEMPT 2: Try 50% of requested range with medium pre-filter (25s timeout)
  BEGIN
    SET LOCAL statement_timeout = '25s';
    
    RAISE NOTICE 'Progressive Search - Attempt 2: Last % days with 700 doc limit', max_days_old / 2;
    
    RETURN QUERY
    WITH recent_docs AS (
      SELECT 
        d.id, d.content, d.metadata, d.embedding, d.document_date
      FROM document_chunks_meetings d
      WHERE 
        d.team_id = match_team_id
        AND (match_category = '' OR d.document_category = match_category)
        AND d.document_date >= CURRENT_DATE - ((max_days_old / 2) || ' days')::interval
      ORDER BY d.document_date DESC
      LIMIT 700
    )
    SELECT 
      rd.id, rd.content, rd.metadata,
      (1 - (rd.embedding <=> query_embedding))::float AS similarity
    FROM recent_docs rd
    WHERE (1 - (rd.embedding <=> query_embedding)) >= 0.40  -- ✅ LOWERED from 0.55
    ORDER BY rd.document_date DESC, similarity DESC
    LIMIT match_count;
    
    GET DIAGNOSTICS result_count = ROW_COUNT;
    IF result_count > 0 THEN
      RAISE NOTICE 'Progressive Search - Attempt 2 SUCCESS: % results', result_count;
      RETURN;
    END IF;
    
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Progressive Search - Attempt 2 FAILED: %', SQLERRM;
  END;
  
  -- ATTEMPT 3: Emergency - last 30 days with tight pre-filter (15s timeout)
  BEGIN
    SET LOCAL statement_timeout = '15s';
    
    RAISE NOTICE 'Progressive Search - Attempt 3: Last 30 days with 400 doc limit (emergency)';
    
    RETURN QUERY
    WITH recent_docs AS (
      -- Pre-filter BEFORE vector computation
      SELECT 
        d.id, d.content, d.metadata, d.embedding, d.document_date
      FROM document_chunks_meetings d
      WHERE 
        d.team_id = match_team_id
        AND (match_category = '' OR d.document_category = match_category)
        AND d.document_date >= CURRENT_DATE - INTERVAL '30 days'
      ORDER BY d.document_date DESC
      LIMIT 400
    )
    SELECT 
      rd.id, rd.content, rd.metadata,
      (1 - (rd.embedding <=> query_embedding))::float AS similarity
    FROM recent_docs rd
    WHERE (1 - (rd.embedding <=> query_embedding)) >= 0.45  -- ✅ LOWERED from 0.60
    ORDER BY rd.document_date DESC, similarity DESC
    LIMIT match_count;
    
    GET DIAGNOSTICS result_count = ROW_COUNT;
    RAISE NOTICE 'Progressive Search - Attempt 3 COMPLETE: % results', result_count;
    RETURN;
    
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Progressive Search - All attempts FAILED: %', SQLERRM;
      RETURN;
  END;
  
END;
$function$;

-- Update comment
COMMENT ON FUNCTION match_documents_meetings_progressive IS 
'Progressive meeting search with LOWERED similarity thresholds for better recall.
Attempt 1: Requested time range, 1000 docs, threshold 0.35 (35s timeout)
Attempt 2: 50% time range, 700 docs, threshold 0.40 (25s timeout)  
Attempt 3: Last 30 days, 400 docs, threshold 0.45 (15s timeout)
ALL attempts pre-filter before vector computation for guaranteed completion.
Lowered thresholds prioritize finding results over perfect similarity.';
