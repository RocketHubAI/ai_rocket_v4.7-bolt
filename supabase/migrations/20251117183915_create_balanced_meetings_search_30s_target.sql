/*
  # Create Balanced Meetings Search with 30-45s Target

  1. Problem
    - Previous ultra_fast function was TOO conservative (< 1s target)
    - We have 120s timeout available, targeting 30-45s is much more reasonable
    - With 30-45s, we can search 30K-45K documents (entire dataset)
    - Better recall without sacrificing reliability

  2. Solution
    - Target 30-45 seconds total execution time
    - Use generous pre-filter limits (15K-30K documents)
    - Progressive approach with realistic timeframes
    - Attempt 1: Full time range requested, 30K doc limit (35s timeout)
    - Attempt 2: 50% of time range, 20K doc limit (25s timeout)
    - Attempt 3: 25% of time range, 10K doc limit (15s timeout)

  3. Strategy
    - Balance recall and speed
    - Can handle any realistic time range (30-365 days)
    - Much better results than ultra_fast version
*/

-- Drop if exists
DROP FUNCTION IF EXISTS public.match_documents_meetings_balanced(vector, jsonb, integer);

-- Create balanced meetings search
CREATE OR REPLACE FUNCTION public.match_documents_meetings_balanced(
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
  days_to_search int;
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

  RAISE NOTICE 'Balanced Search - team: %, category: %, max_days: %', 
    match_team_id, match_category, max_days_old;

  -- ATTEMPT 1: Full time range with 30K doc limit (35s timeout)
  BEGIN
    SET LOCAL statement_timeout = '35s';
    days_to_search := max_days_old;

    RAISE NOTICE 'Balanced Search - Attempt 1: % days, 30K doc limit', days_to_search;

    RETURN QUERY
    WITH recent_sample AS (
      -- Pre-filter by date and team, limit to 30K docs
      SELECT d.id, d.content, d.metadata, d.embedding, d.document_date
      FROM document_chunks_meetings d
      WHERE
        d.team_id = match_team_id
        AND (match_category = '' OR d.document_category = match_category)
        AND d.document_date >= CURRENT_DATE - (days_to_search || ' days')::interval
      ORDER BY d.document_date DESC
      LIMIT 30000
    ),
    scored_results AS (
      SELECT
        rs.id,
        rs.content,
        rs.metadata,
        (1 - (rs.embedding <=> query_embedding))::float AS base_similarity,
        EXTRACT(EPOCH FROM (CURRENT_DATE - rs.document_date::date)) / 86400.0 AS days_old
      FROM recent_sample rs
    )
    SELECT
      sr.id,
      sr.content,
      sr.metadata,
      -- Apply recency weighting
      (sr.base_similarity * (1 - recency_weight) + 
       ((1 - (sr.days_old / NULLIF(max_days_old, 0))) * recency_weight))::float AS similarity
    FROM scored_results sr
    WHERE sr.base_similarity >= 0.50  -- Lower threshold for better recall
    ORDER BY similarity DESC
    LIMIT match_count;

    GET DIAGNOSTICS result_count = ROW_COUNT;
    IF result_count > 0 THEN
      RAISE NOTICE 'Balanced Search - Attempt 1 SUCCESS: % results', result_count;
      RETURN;
    END IF;

  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Balanced Search - Attempt 1 FAILED: %', SQLERRM;
  END;

  -- ATTEMPT 2: 50% of time range, 20K doc limit (25s timeout)
  BEGIN
    SET LOCAL statement_timeout = '25s';
    days_to_search := GREATEST(max_days_old / 2, 30);  -- At least 30 days

    RAISE NOTICE 'Balanced Search - Attempt 2: % days, 20K doc limit', days_to_search;

    RETURN QUERY
    WITH recent_sample AS (
      SELECT d.id, d.content, d.metadata, d.embedding, d.document_date
      FROM document_chunks_meetings d
      WHERE
        d.team_id = match_team_id
        AND (match_category = '' OR d.document_category = match_category)
        AND d.document_date >= CURRENT_DATE - (days_to_search || ' days')::interval
      ORDER BY d.document_date DESC
      LIMIT 20000
    ),
    scored_results AS (
      SELECT
        rs.id,
        rs.content,
        rs.metadata,
        (1 - (rs.embedding <=> query_embedding))::float AS base_similarity,
        EXTRACT(EPOCH FROM (CURRENT_DATE - rs.document_date::date)) / 86400.0 AS days_old
      FROM recent_sample rs
    )
    SELECT
      sr.id,
      sr.content,
      sr.metadata,
      (sr.base_similarity * (1 - recency_weight) + 
       ((1 - (sr.days_old / NULLIF(days_to_search, 0))) * recency_weight))::float AS similarity
    FROM scored_results sr
    WHERE sr.base_similarity >= 0.55
    ORDER BY similarity DESC
    LIMIT match_count;

    GET DIAGNOSTICS result_count = ROW_COUNT;
    IF result_count > 0 THEN
      RAISE NOTICE 'Balanced Search - Attempt 2 SUCCESS: % results', result_count;
      RETURN;
    END IF;

  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Balanced Search - Attempt 2 FAILED: %', SQLERRM;
  END;

  -- ATTEMPT 3: 25% of time range, 10K doc limit (15s timeout)
  BEGIN
    SET LOCAL statement_timeout = '15s';
    days_to_search := GREATEST(max_days_old / 4, 14);  -- At least 14 days

    RAISE NOTICE 'Balanced Search - Attempt 3: % days, 10K doc limit', days_to_search;

    RETURN QUERY
    WITH recent_sample AS (
      SELECT d.id, d.content, d.metadata, d.embedding
      FROM document_chunks_meetings d
      WHERE
        d.team_id = match_team_id
        AND (match_category = '' OR d.document_category = match_category)
        AND d.document_date >= CURRENT_DATE - (days_to_search || ' days')::interval
      ORDER BY d.document_date DESC
      LIMIT 10000
    )
    SELECT
      rs.id,
      rs.content,
      rs.metadata,
      (1 - (rs.embedding <=> query_embedding))::float AS similarity
    FROM recent_sample rs
    WHERE (1 - (rs.embedding <=> query_embedding)) >= 0.60
    ORDER BY similarity DESC
    LIMIT match_count;

    GET DIAGNOSTICS result_count = ROW_COUNT;
    RAISE NOTICE 'Balanced Search - Attempt 3 COMPLETE: % results', result_count;
    RETURN;

  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Balanced Search - All attempts FAILED: %', SQLERRM;
      RETURN;
  END;

END;
$function$;

-- Add comment
COMMENT ON FUNCTION public.match_documents_meetings_balanced IS
'Balanced meeting search targeting 30-45s execution time.
Can search 30K-45K documents (entire realistic dataset).
Attempt 1: Full time range, 30K docs (35s)
Attempt 2: 50% time range, 20K docs (25s)
Attempt 3: 25% time range, 10K docs (15s)
Uses recency_weight and max_days_old from filters.
Much better recall than ultra_fast version.';
