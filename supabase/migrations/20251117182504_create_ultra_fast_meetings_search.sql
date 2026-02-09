/*
  # Create Ultra-Fast Meetings Search for Large Datasets

  1. Problem
    - Team has 30K+ meeting chunks causing progressive search to timeout
    - Even the "emergency fallback" (30 days) times out on large datasets
    - Need a much more aggressive approach for teams with massive data

  2. Solution
    - Create ultra-fast search with very short windows
    - Attempt 1: Last 14 days (15s timeout)
    - Attempt 2: Last 30 days, pre-filtered to 200 docs (20s timeout)
    - Attempt 3: Last 7 days only, absolute minimal (10s timeout)
    - Use LIMIT heavily before vector operations

  3. Strategy
    - Prioritize recency over completeness
    - Sacrifice some recall for guaranteed completion
    - Pre-filter by date before expensive vector operations
*/

-- Drop if exists
DROP FUNCTION IF EXISTS public.match_documents_meetings_ultra_fast(vector, jsonb, integer);

-- Create ultra-fast meetings search
CREATE OR REPLACE FUNCTION public.match_documents_meetings_ultra_fast(
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
  result_count int;
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

  -- Validate team_id
  IF match_team_id IS NULL THEN
    RAISE EXCEPTION 'Missing required parameter: team_id';
  END IF;

  RAISE NOTICE 'Ultra-Fast Search - team: %, category: %', match_team_id, match_category;

  -- ATTEMPT 1: Last 14 days with strict limits (15s timeout)
  BEGIN
    SET LOCAL statement_timeout = '15s';

    RAISE NOTICE 'Ultra-Fast Search - Attempt 1: Last 14 days';

    RETURN QUERY
    WITH recent_sample AS (
      -- Pre-filter to recent 14 days and limit BEFORE vector operations
      SELECT d.id, d.content, d.metadata, d.embedding
      FROM document_chunks_meetings d
      WHERE
        d.team_id = match_team_id
        AND (match_category = '' OR d.document_category = match_category)
        AND d.document_date >= CURRENT_DATE - INTERVAL '14 days'
      ORDER BY d.document_date DESC
      LIMIT 300  -- Hard limit before vector search
    )
    SELECT
      rs.id,
      rs.content,
      rs.metadata,
      (1 - (rs.embedding <=> query_embedding))::float AS similarity
    FROM recent_sample rs
    WHERE (1 - (rs.embedding <=> query_embedding)) >= 0.55
    ORDER BY similarity DESC
    LIMIT match_count;

    GET DIAGNOSTICS result_count = ROW_COUNT;
    IF result_count > 0 THEN
      RAISE NOTICE 'Ultra-Fast Search - Attempt 1 SUCCESS: % results', result_count;
      RETURN;
    END IF;

  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Ultra-Fast Search - Attempt 1 FAILED: %', SQLERRM;
  END;

  -- ATTEMPT 2: Last 30 days, smaller sample (20s timeout)
  BEGIN
    SET LOCAL statement_timeout = '20s';

    RAISE NOTICE 'Ultra-Fast Search - Attempt 2: Last 30 days (small sample)';

    RETURN QUERY
    WITH recent_sample AS (
      SELECT d.id, d.content, d.metadata, d.embedding
      FROM document_chunks_meetings d
      WHERE
        d.team_id = match_team_id
        AND (match_category = '' OR d.document_category = match_category)
        AND d.document_date >= CURRENT_DATE - INTERVAL '30 days'
      ORDER BY d.document_date DESC
      LIMIT 250  -- Even smaller sample
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
    IF result_count > 0 THEN
      RAISE NOTICE 'Ultra-Fast Search - Attempt 2 SUCCESS: % results', result_count;
      RETURN;
    END IF;

  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Ultra-Fast Search - Attempt 2 FAILED: %', SQLERRM;
  END;

  -- ATTEMPT 3: Last 7 days only, absolute minimum (10s timeout)
  BEGIN
    SET LOCAL statement_timeout = '10s';

    RAISE NOTICE 'Ultra-Fast Search - Attempt 3: Last 7 days (emergency)';

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
      AND d.document_date >= CURRENT_DATE - INTERVAL '7 days'
      AND (1 - (d.embedding <=> query_embedding)) >= 0.65
    ORDER BY d.document_date DESC
    LIMIT LEAST(match_count, 100);

    GET DIAGNOSTICS result_count = ROW_COUNT;
    RAISE NOTICE 'Ultra-Fast Search - Attempt 3 COMPLETE: % results', result_count;
    RETURN;

  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Ultra-Fast Search - All attempts FAILED: %', SQLERRM;
      RETURN;
  END;

END;
$function$;

-- Add comment
COMMENT ON FUNCTION public.match_documents_meetings_ultra_fast IS
'Ultra-fast meeting search for teams with 30K+ documents.
Prioritizes speed and guaranteed completion over completeness.
Attempt 1: Last 14 days, 300 doc sample (15s)
Attempt 2: Last 30 days, 250 doc sample (20s)
Attempt 3: Last 7 days only (10s emergency)
Total max time: ~45s with guaranteed completion.';
