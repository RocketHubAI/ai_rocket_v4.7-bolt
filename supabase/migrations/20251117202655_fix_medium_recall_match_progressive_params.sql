/*
  # Fix Medium-Recall to Match Progressive Function Parameters
  
  1. Problem
    - Medium-recall returning empty results
    - Parameter extraction might differ from working progressive function
    - Need to match exactly what progressive does
    
  2. Solution
    - Copy parameter extraction logic from progressive function
    - Use same COALESCE patterns
    - Match default values
    - Ensure compatibility with n8n node output
    
  3. Changes
    - Update parameter extraction to match progressive exactly
    - Keep the permissive similarity thresholds
    - Maintain the progressive fallback structure
*/

DROP FUNCTION IF EXISTS public.match_documents_meetings_medium_recall(vector, jsonb, integer);

CREATE OR REPLACE FUNCTION public.match_documents_meetings_medium_recall(
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
  max_days_old int;
  recency_weight float;
  result_count int;
BEGIN
  -- Extract parameters EXACTLY like progressive function
  match_team_id := COALESCE((filter->>'match_team_id')::uuid, (filter->>'team_id')::uuid);
  match_category := COALESCE((filter->>'match_category')::text, '');
  recency_weight := COALESCE((filter->>'recency_weight')::float, 0.15);
  max_days_old := COALESCE((filter->>'max_days_old')::int, 365);
  
  -- Validate team_id
  IF match_team_id IS NULL THEN
    RAISE EXCEPTION 'Missing required parameter: team_id';
  END IF;
  
  RAISE NOTICE 'Medium-Recall Search - team: %, category: %, max_days: %', 
    match_team_id, match_category, max_days_old;

  -- ATTEMPT 1: Try requested time range with 1200 doc limit (25s timeout)
  BEGIN
    SET LOCAL statement_timeout = '25s';
    
    RAISE NOTICE 'Medium-Recall - Attempt 1: Last % days with 1200 doc limit', max_days_old;
    
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
      LIMIT 1200
    ),
    scored_docs AS (
      SELECT 
        rd.id, rd.content, rd.metadata,
        (1 - (rd.embedding <=> query_embedding))::float AS base_similarity,
        rd.document_date
      FROM recent_docs rd
      WHERE (1 - (rd.embedding <=> query_embedding)) >= 0.35  -- Permissive like progressive
    )
    SELECT 
      sd.id, sd.content, sd.metadata,
      sd.base_similarity AS similarity
    FROM scored_docs sd
    ORDER BY sd.document_date DESC, sd.base_similarity DESC
    LIMIT match_count;
    
    GET DIAGNOSTICS result_count = ROW_COUNT;
    IF result_count > 0 THEN
      RAISE NOTICE 'Medium-Recall - Attempt 1 SUCCESS: % results', result_count;
      RETURN;
    END IF;
    
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Medium-Recall - Attempt 1 FAILED: %', SQLERRM;
  END;

  -- ATTEMPT 2: Try 50% of requested range with 800 doc limit (20s timeout)
  BEGIN
    SET LOCAL statement_timeout = '20s';
    
    RAISE NOTICE 'Medium-Recall - Attempt 2: Last % days with 800 doc limit', max_days_old / 2;
    
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
      LIMIT 800
    )
    SELECT 
      rd.id, rd.content, rd.metadata,
      (1 - (rd.embedding <=> query_embedding))::float AS similarity
    FROM recent_docs rd
    WHERE (1 - (rd.embedding <=> query_embedding)) >= 0.40
    ORDER BY rd.document_date DESC, similarity DESC
    LIMIT match_count;
    
    GET DIAGNOSTICS result_count = ROW_COUNT;
    IF result_count > 0 THEN
      RAISE NOTICE 'Medium-Recall - Attempt 2 SUCCESS: % results', result_count;
      RETURN;
    END IF;
    
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Medium-Recall - Attempt 2 FAILED: %', SQLERRM;
  END;

  -- ATTEMPT 3: Emergency - last 30 days with 500 doc limit (15s timeout)
  BEGIN
    SET LOCAL statement_timeout = '15s';
    
    RAISE NOTICE 'Medium-Recall - Attempt 3: Last 30 days with 500 doc limit (emergency)';
    
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
      LIMIT 500
    )
    SELECT 
      rd.id, rd.content, rd.metadata,
      (1 - (rd.embedding <=> query_embedding))::float AS similarity
    FROM recent_docs rd
    WHERE (1 - (rd.embedding <=> query_embedding)) >= 0.45
    ORDER BY rd.document_date DESC, similarity DESC
    LIMIT match_count;
    
    GET DIAGNOSTICS result_count = ROW_COUNT;
    RAISE NOTICE 'Medium-Recall - Attempt 3 COMPLETE: % results', result_count;
    RETURN;
    
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Medium-Recall - All attempts FAILED: %', SQLERRM;
      RETURN;
  END;
  
END;
$function$;

COMMENT ON FUNCTION match_documents_meetings_medium_recall IS 
'Medium-recall meeting search matching progressive function parameter structure.
Attempt 1: Requested time range, 1200 docs, threshold 0.35 (25s)
Attempt 2: 50% time range, 800 docs, threshold 0.40 (20s)  
Attempt 3: Last 30 days, 500 docs, threshold 0.45 (15s)
Similar to progressive but with higher doc limits for better recall.
Targets 5-10 meetings vs 2-3 meetings from progressive.';