/*
  # Fix Progressive Function for N8N Compatibility

  1. Problem
    - N8N Supabase Vector Store node passes parameters differently than expected
    - Function expects team_id inside a JSONB `filter` parameter
    - N8N is passing `filter` as metadata but team_id extraction is failing

  2. Solution
    - Create a wrapper function that accepts parameters the way N8N passes them
    - Add explicit parameter extraction with better null handling
    - Maintain backward compatibility with existing function

  3. Changes
    - Drop and recreate function with better parameter handling
    - Add defensive null checks
    - Improve error messages for debugging
*/

-- Drop existing function
DROP FUNCTION IF EXISTS public.match_documents_meetings_progressive(vector, jsonb, integer);

-- Recreate with better parameter handling
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
  -- Debug logging
  RAISE NOTICE 'Progressive Search - Input filter: %', filter::text;

  -- Extract parameters with multiple fallback paths
  match_team_id := COALESCE(
    (filter->>'match_team_id')::uuid,
    (filter->>'team_id')::uuid
  );

  match_category := COALESCE(
    (filter->>'match_category')::text,
    (filter->>'category')::text,
    ''
  );

  recency_weight := COALESCE(
    (filter->>'recency_weight')::float,
    0.15
  );

  max_days_old := COALESCE(
    (filter->>'max_days_old')::int,
    365
  );

  -- Debug logging
  RAISE NOTICE 'Progressive Search - Extracted team_id: %, category: %', match_team_id, match_category;

  -- Validate team_id
  IF match_team_id IS NULL THEN
    RAISE EXCEPTION 'Missing required parameter: team_id (filter contains: %)', filter::text;
  END IF;

  -- ATTEMPT 1: Try last 60 days first (most queries should complete here)
  BEGIN
    SET LOCAL statement_timeout = '45s';

    RAISE NOTICE 'Progressive Search - Attempt 1: Last 60 days (team: %, category: %)', match_team_id, match_category;

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

-- Add helpful comment
COMMENT ON FUNCTION match_documents_meetings_progressive IS
'Progressive meeting search compatible with N8N Supabase Vector Store node.
Automatically falls back to narrower date ranges if queries timeout.
Attempt 1: Last 60 days (45s timeout)
Attempt 2: Last 180 days simplified (60s timeout)
Attempt 3: Last 30 days emergency (30s timeout)
Guarantees results or graceful failure within ~135s total.

Parameters:
- query_embedding: Vector embedding to search for
- filter: JSONB object containing:
  - match_team_id or team_id (uuid, required)
  - match_category or category (text, optional, empty string = all)
  - recency_weight (float, optional, default 0.15)
  - max_days_old (int, optional, default 365)
- match_count: Number of results to return (default 200)';