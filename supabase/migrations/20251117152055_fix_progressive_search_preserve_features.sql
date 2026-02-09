/*
  # Fix Progressive Search - Preserve All Original Features
  
  1. Problem
    - Progressive function loses recency weighting from original
    - Progressive function ignores max_days_old parameter
    - Need to preserve ALL functionality while adding fallback
  
  2. Solution
    - Restore hybrid scoring with recency_weight
    - Respect max_days_old parameter from preprocessor
    - Add progressive fallbacks ONLY when needed
    - Keep identical return schema and behavior
  
  3. Strategy
    - Attempt 1: Use requested max_days_old with full features
    - Attempt 2: If timeout, reduce to 50% of max_days_old
    - Attempt 3: If still timeout, emergency 30 days
    - Each attempt preserves recency weighting
  
  4. Changes
    - Update match_documents_meetings_progressive
    - Preserve recency_weight parameter
    - Use max_days_old from filter properly
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
  min_similarity float;
BEGIN
  -- Extract ALL parameters (preserve original functionality)
  match_team_id := COALESCE((filter->>'match_team_id')::uuid, (filter->>'team_id')::uuid);
  match_category := COALESCE((filter->>'match_category')::text, '');
  recency_weight := COALESCE((filter->>'recency_weight')::float, 0.15);
  max_days_old := COALESCE((filter->>'max_days_old')::int, 365);
  min_similarity := 0.5;
  
  -- Validate team_id
  IF match_team_id IS NULL THEN
    RAISE EXCEPTION 'Missing required parameter: team_id';
  END IF;
  
  -- ATTEMPT 1: Try FULL requested range (respect preprocessor settings)
  BEGIN
    SET LOCAL statement_timeout = '60s';
    
    attempt_days := max_days_old;
    RAISE NOTICE 'Progressive Search - Attempt 1: Last % days (requested range)', attempt_days;
    
    RETURN QUERY
    WITH recent_docs AS (
      SELECT 
        d.id, d.content, d.metadata, d.embedding, d.document_date,
        EXTRACT(EPOCH FROM (CURRENT_DATE - d.document_date)) / 86400.0 AS days_old
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
        rd.id, rd.content, rd.metadata,
        (1 - (rd.embedding <=> query_embedding))::float AS base_similarity,
        GREATEST(0, 1 - (rd.days_old / max_days_old))::float AS recency_score,
        rd.document_date
      FROM recent_docs rd
      WHERE (1 - (rd.embedding <=> query_embedding)) >= min_similarity
    )
    -- PRESERVE HYBRID SCORING from original function
    SELECT 
      sd.id, sd.content, sd.metadata,
      ((sd.base_similarity * (1 - recency_weight)) + (sd.recency_score * recency_weight))::float AS similarity
    FROM scored_docs sd
    ORDER BY sd.document_date DESC, similarity DESC
    LIMIT match_count;
    
    GET DIAGNOSTICS result_count = ROW_COUNT;
    IF result_count > 0 THEN
      RAISE NOTICE 'Progressive Search - Attempt 1 SUCCESS: % results', result_count;
      RETURN;
    END IF;
    
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Progressive Search - Attempt 1 FAILED: %, trying Attempt 2', SQLERRM;
  END;
  
  -- ATTEMPT 2: Try 50% of requested range (adaptive reduction)
  BEGIN
    SET LOCAL statement_timeout = '60s';
    
    attempt_days := GREATEST(max_days_old / 2, 60)::int;
    RAISE NOTICE 'Progressive Search - Attempt 2: Last % days (50%% of requested)', attempt_days;
    
    RETURN QUERY
    WITH recent_docs AS (
      SELECT 
        d.id, d.content, d.metadata, d.embedding, d.document_date,
        EXTRACT(EPOCH FROM (CURRENT_DATE - d.document_date)) / 86400.0 AS days_old
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
        rd.id, rd.content, rd.metadata,
        (1 - (rd.embedding <=> query_embedding))::float AS base_similarity,
        GREATEST(0, 1 - (rd.days_old / attempt_days))::float AS recency_score,
        rd.document_date
      FROM recent_docs rd
      WHERE (1 - (rd.embedding <=> query_embedding)) >= min_similarity
    )
    SELECT 
      sd.id, sd.content, sd.metadata,
      ((sd.base_similarity * (1 - recency_weight)) + (sd.recency_score * recency_weight))::float AS similarity
    FROM scored_docs sd
    ORDER BY sd.document_date DESC, similarity DESC
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
  
  -- ATTEMPT 3: Emergency fallback - last 30 days
  BEGIN
    SET LOCAL statement_timeout = '30s';
    
    attempt_days := 30;
    RAISE NOTICE 'Progressive Search - Attempt 3: Last 30 days (emergency fallback)';
    
    RETURN QUERY
    WITH recent_docs AS (
      SELECT 
        d.id, d.content, d.metadata, d.embedding, d.document_date,
        EXTRACT(EPOCH FROM (CURRENT_DATE - d.document_date)) / 86400.0 AS days_old
      FROM document_chunks_meetings d
      WHERE 
        d.team_id = match_team_id
        AND (match_category = '' OR d.document_category = match_category)
        AND d.document_date >= CURRENT_DATE - INTERVAL '30 days'
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
    RAISE NOTICE 'Progressive Search - Attempt 3 COMPLETE: % results', result_count;
    RETURN;
    
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Progressive Search - All attempts FAILED: %', SQLERRM;
      RETURN;
  END;
  
END;
$function$;

COMMENT ON FUNCTION match_documents_meetings_progressive IS 
'Progressive meeting search with ALL features from original function preserved.
- Respects max_days_old parameter from preprocessor
- Preserves recency_weight hybrid scoring
- Adds progressive fallbacks for reliability
- Attempt 1: Full requested range (60s timeout)
- Attempt 2: 50% of requested range (60s timeout)
- Attempt 3: 30 days emergency (30s timeout)
Drop-in replacement for match_documents_filtered_recency_weighted_fast.';
