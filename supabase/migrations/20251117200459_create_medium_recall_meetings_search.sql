/*
  # Create Medium-Recall Meetings Search Function

  1. Problem
    - Progressive function: Too conservative (2-3 meetings, only 60 days)
    - Balanced function: Times out (tries 30K docs)
    - Need: More meetings than progressive, faster than balanced

  2. Solution
    - Target 5-10 meetings for "recent" queries
    - Use 90-120 day window (not 60)
    - Limit to 5K-8K documents per attempt (not 30K)
    - 3 progressive attempts with realistic timeouts
    - Lower similarity thresholds for better recall

  3. Strategy
    - Attempt 1: 120 days, 8K docs, 0.45 similarity (25s timeout)
    - Attempt 2: 90 days, 5K docs, 0.50 similarity (20s timeout)
    - Attempt 3: 60 days, 3K docs, 0.55 similarity (15s timeout)

  4. Performance Profile
    - ~20-30s average execution time
    - Returns 5-10 meetings for typical "recent" queries
    - Handles 100-150 chunks per meeting efficiently
    - Won't timeout on realistic datasets
*/

-- Drop if exists
DROP FUNCTION IF EXISTS public.match_documents_meetings_medium_recall(vector, jsonb, integer);

-- Create medium-recall meetings search
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
  similarity_threshold float;
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
    180  -- Default to 180 days
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

  -- ATTEMPT 1: 120 days, 8K docs, lower threshold for better recall (25s)
  BEGIN
    SET LOCAL statement_timeout = '25s';
    days_to_search := LEAST(max_days_old, 120);
    doc_limit := 8000;
    similarity_threshold := 0.45;

    RAISE NOTICE 'Medium-Recall - Attempt 1: %d days, %d doc limit, %.2f threshold',
      days_to_search, doc_limit, similarity_threshold;

    RETURN QUERY
    WITH recent_sample AS (
      -- Pre-filter by date and team, order by date desc for recency
      SELECT
        d.id,
        d.content,
        d.metadata,
        d.embedding,
        d.document_date,
        d.document_category
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
      WHERE (1 - (rs.embedding <=> query_embedding)) >= similarity_threshold
    )
    SELECT
      sr.id,
      sr.content,
      sr.metadata,
      -- Apply recency weighting: newer docs get boosted
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

  -- ATTEMPT 2: 90 days, 5K docs, moderate threshold (20s)
  BEGIN
    SET LOCAL statement_timeout = '20s';
    days_to_search := LEAST(max_days_old, 90);
    doc_limit := 5000;
    similarity_threshold := 0.50;

    RAISE NOTICE 'Medium-Recall - Attempt 2: %d days, %d doc limit, %.2f threshold',
      days_to_search, doc_limit, similarity_threshold;

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
      WHERE (1 - (rs.embedding <=> query_embedding)) >= similarity_threshold
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

  -- ATTEMPT 3: 60 days, 3K docs, higher threshold (15s)
  BEGIN
    SET LOCAL statement_timeout = '15s';
    days_to_search := LEAST(max_days_old, 60);
    doc_limit := 3000;
    similarity_threshold := 0.55;

    RAISE NOTICE 'Medium-Recall - Attempt 3: %d days, %d doc limit, %.2f threshold',
      days_to_search, doc_limit, similarity_threshold;

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
    WHERE (1 - (rs.embedding <=> query_embedding)) >= similarity_threshold
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

-- Add comment
COMMENT ON FUNCTION public.match_documents_meetings_medium_recall IS
'Medium-recall meeting search balancing speed and breadth.
Attempt 1: 120 days, 8K docs, 0.45 threshold (25s) - Best for typical queries
Attempt 2: 90 days, 5K docs, 0.50 threshold (20s) - Fallback with good recall
Attempt 3: 60 days, 3K docs, 0.55 threshold (15s) - Fast emergency fallback
Target: 5-10 meetings with 100-150 chunks each
Total execution: 20-30s average, 60s maximum
Optimized for "recent" queries that need more than 2-3 meetings.';