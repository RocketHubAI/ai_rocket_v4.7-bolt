/*
  # Fix Medium-Recall Function - Lower Similarity Thresholds
  
  1. Problem
    - Current thresholds (0.45, 0.50, 0.55) returning empty results
    - Need more permissive matching while maintaining relevance
    
  2. Solution
    - Significantly lower similarity thresholds
    - Remove similarity filtering in first 2 attempts
    - Let recency weighting and LIMIT do the filtering
    - Only apply minimal threshold in final attempt
    
  3. Changes
    - Attempt 1: NO similarity threshold (let all docs through)
    - Attempt 2: 0.40 threshold (very permissive)
    - Attempt 3: 0.45 threshold (still lower than before)
*/

DROP FUNCTION IF EXISTS public.match_documents_meetings_medium_recall(vector, jsonb, integer);

CREATE OR REPLACE FUNCTION public.match_documents_meetings_medium_recall(
  query_embedding vector,
  filter jsonb DEFAULT '{}'::jsonb,
  match_count integer DEFAULT 400
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
  days_to_search int;
  doc_limit int;
BEGIN
  -- Extract parameters
  match_team_id := COALESCE(
    (filter->>'match_team_id')::uuid,
    (filter->>'team_id')::uuid
  );

  match_category := COALESCE(
    (filter->>'match_category')::text,
    (filter->>'category')::text,
    ''
  );

  max_days_old := COALESCE(
    (filter->>'max_days_old')::int,
    180
  );

  recency_weight := COALESCE(
    (filter->>'recency_weight')::float,
    0.25
  );

  -- Validate team_id
  IF match_team_id IS NULL THEN
    RAISE EXCEPTION 'Missing required parameter: team_id';
  END IF;

  RAISE NOTICE 'Medium-Recall Search - team: %, category: %, max_days: %, target chunks: %',
    match_team_id, match_category, max_days_old, match_count;

  -- ATTEMPT 1: 120 days, 8K docs, NO similarity threshold (25s)
  -- Let semantic search rank naturally, no hard filtering
  BEGIN
    SET LOCAL statement_timeout = '25s';
    days_to_search := LEAST(max_days_old, 120);
    doc_limit := 8000;

    RAISE NOTICE 'Medium-Recall - Attempt 1: %d days, %d doc limit, NO threshold (permissive)',
      days_to_search, doc_limit;

    RETURN QUERY
    WITH recent_sample AS (
      SELECT
        d.id,
        d.content,
        d.metadata,
        d.embedding,
        d.document_date
      FROM document_chunks_meetings d
      WHERE
        d.team_id = match_team_id
        AND (match_category = '' OR d.document_category = match_category)
        AND d.document_date >= CURRENT_DATE - (days_to_search || ' days')::interval
      ORDER BY d.document_date DESC
      LIMIT doc_limit
    ),
    scored_results AS (
      SELECT
        rs.id,
        rs.content,
        rs.metadata,
        (1 - (rs.embedding <=> query_embedding))::float AS base_similarity,
        rs.document_date,
        EXTRACT(EPOCH FROM (CURRENT_DATE - rs.document_date::date)) / 86400.0 AS days_old
      FROM recent_sample rs
      -- NO similarity threshold - let all through
    )
    SELECT
      sr.id,
      sr.content,
      sr.metadata,
      -- Apply recency weighting
      (sr.base_similarity * (1 - recency_weight) +
       ((1 - (sr.days_old / NULLIF(days_to_search, 0))) * recency_weight))::float AS similarity
    FROM scored_results sr
    ORDER BY sr.document_date DESC, similarity DESC
    LIMIT match_count;

    GET DIAGNOSTICS result_count = ROW_COUNT;
    IF result_count > 0 THEN
      RAISE NOTICE 'Medium-Recall - Attempt 1 SUCCESS: % chunks returned', result_count;
      RETURN;
    END IF;

  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Medium-Recall - Attempt 1 FAILED: %', SQLERRM;
  END;

  -- ATTEMPT 2: 90 days, 5K docs, 0.40 threshold (20s)
  BEGIN
    SET LOCAL statement_timeout = '20s';
    days_to_search := LEAST(max_days_old, 90);
    doc_limit := 5000;

    RAISE NOTICE 'Medium-Recall - Attempt 2: %d days, %d doc limit, 0.40 threshold',
      days_to_search, doc_limit;

    RETURN QUERY
    WITH recent_sample AS (
      SELECT
        d.id,
        d.content,
        d.metadata,
        d.embedding,
        d.document_date
      FROM document_chunks_meetings d
      WHERE
        d.team_id = match_team_id
        AND (match_category = '' OR d.document_category = match_category)
        AND d.document_date >= CURRENT_DATE - (days_to_search || ' days')::interval
      ORDER BY d.document_date DESC
      LIMIT doc_limit
    ),
    scored_results AS (
      SELECT
        rs.id,
        rs.content,
        rs.metadata,
        (1 - (rs.embedding <=> query_embedding))::float AS base_similarity,
        rs.document_date,
        EXTRACT(EPOCH FROM (CURRENT_DATE - rs.document_date::date)) / 86400.0 AS days_old
      FROM recent_sample rs
      WHERE (1 - (rs.embedding <=> query_embedding)) >= 0.40  -- Very permissive
    )
    SELECT
      sr.id,
      sr.content,
      sr.metadata,
      (sr.base_similarity * (1 - recency_weight) +
       ((1 - (sr.days_old / NULLIF(days_to_search, 0))) * recency_weight))::float AS similarity
    FROM scored_results sr
    ORDER BY sr.document_date DESC, similarity DESC
    LIMIT match_count;

    GET DIAGNOSTICS result_count = ROW_COUNT;
    IF result_count > 0 THEN
      RAISE NOTICE 'Medium-Recall - Attempt 2 SUCCESS: % chunks returned', result_count;
      RETURN;
    END IF;

  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Medium-Recall - Attempt 2 FAILED: %', SQLERRM;
  END;

  -- ATTEMPT 3: 60 days, 3K docs, 0.45 threshold (15s)
  BEGIN
    SET LOCAL statement_timeout = '15s';
    days_to_search := LEAST(max_days_old, 60);
    doc_limit := 3000;

    RAISE NOTICE 'Medium-Recall - Attempt 3: %d days, %d doc limit, 0.45 threshold',
      days_to_search, doc_limit;

    RETURN QUERY
    WITH recent_sample AS (
      SELECT
        d.id,
        d.content,
        d.metadata,
        d.embedding,
        d.document_date
      FROM document_chunks_meetings d
      WHERE
        d.team_id = match_team_id
        AND (match_category = '' OR d.document_category = match_category)
        AND d.document_date >= CURRENT_DATE - (days_to_search || ' days')::interval
      ORDER BY d.document_date DESC
      LIMIT doc_limit
    )
    SELECT
      rs.id,
      rs.content,
      rs.metadata,
      (1 - (rs.embedding <=> query_embedding))::float AS similarity
    FROM recent_sample rs
    WHERE (1 - (rs.embedding <=> query_embedding)) >= 0.45
    ORDER BY rs.document_date DESC, similarity DESC
    LIMIT match_count;

    GET DIAGNOSTICS result_count = ROW_COUNT;
    RAISE NOTICE 'Medium-Recall - Attempt 3 COMPLETE: % chunks returned', result_count;
    RETURN;

  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Medium-Recall - All attempts FAILED: %', SQLERRM;
      RETURN;
  END;

END;
$function$;

COMMENT ON FUNCTION public.match_documents_meetings_medium_recall IS
'Medium-recall meeting search with very permissive thresholds.
Attempt 1: 120 days, 8K docs, NO threshold (25s) - Maximum recall
Attempt 2: 90 days, 5K docs, 0.40 threshold (20s) - Very permissive
Attempt 3: 60 days, 3K docs, 0.45 threshold (15s) - Still generous
Optimized to return results even for loosely matching queries.';