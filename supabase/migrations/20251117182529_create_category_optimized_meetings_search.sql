/*
  # Create Category-Optimized Meetings Search

  1. Problem
    - When category IS specified, searches should be much faster
    - Current progressive function doesn't optimize for single-category searches
    - With 30K+ docs, we need separate logic for category vs. all-category searches

  2. Solution
    - Create optimized function specifically for when category is provided
    - Can search much further back (90 days) when category filters the dataset
    - Use category as primary filter to reduce dataset before vector search

  3. Strategy
    - Single category = smaller dataset = can afford longer timeframes
    - Still use progressive approach but with longer windows
*/

-- Drop if exists
DROP FUNCTION IF EXISTS public.match_documents_meetings_by_category(vector, jsonb, integer);

-- Create category-optimized search
CREATE OR REPLACE FUNCTION public.match_documents_meetings_by_category(
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
    (filter->>'category')::text
  );

  -- Validate required params
  IF match_team_id IS NULL THEN
    RAISE EXCEPTION 'Missing required parameter: team_id';
  END IF;

  IF match_category IS NULL OR match_category = '' THEN
    RAISE EXCEPTION 'This function requires a specific category. Use ultra_fast for all categories.';
  END IF;

  RAISE NOTICE 'Category-Optimized Search - team: %, category: %', match_team_id, match_category;

  -- ATTEMPT 1: Last 90 days (30s timeout - category filtering makes this feasible)
  BEGIN
    SET LOCAL statement_timeout = '30s';

    RAISE NOTICE 'Category Search - Attempt 1: Last 90 days';

    RETURN QUERY
    WITH category_recent AS (
      SELECT d.id, d.content, d.metadata, d.embedding, d.document_date
      FROM document_chunks_meetings d
      WHERE
        d.team_id = match_team_id
        AND d.document_category = match_category
        AND d.document_date >= CURRENT_DATE - INTERVAL '90 days'
      ORDER BY d.document_date DESC
      LIMIT LEAST(match_count * 2, 500)::int
    )
    SELECT
      cr.id,
      cr.content,
      cr.metadata,
      (1 - (cr.embedding <=> query_embedding))::float AS similarity
    FROM category_recent cr
    WHERE (1 - (cr.embedding <=> query_embedding)) >= 0.50
    ORDER BY cr.document_date DESC, similarity DESC
    LIMIT match_count;

    GET DIAGNOSTICS result_count = ROW_COUNT;
    IF result_count > 0 THEN
      RAISE NOTICE 'Category Search - Attempt 1 SUCCESS: % results', result_count;
      RETURN;
    END IF;

  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Category Search - Attempt 1 FAILED: %', SQLERRM;
  END;

  -- ATTEMPT 2: Last 180 days (40s timeout)
  BEGIN
    SET LOCAL statement_timeout = '40s';

    RAISE NOTICE 'Category Search - Attempt 2: Last 180 days';

    RETURN QUERY
    WITH category_recent AS (
      SELECT d.id, d.content, d.metadata, d.embedding
      FROM document_chunks_meetings d
      WHERE
        d.team_id = match_team_id
        AND d.document_category = match_category
        AND d.document_date >= CURRENT_DATE - INTERVAL '180 days'
      ORDER BY d.document_date DESC
      LIMIT 400
    )
    SELECT
      cr.id,
      cr.content,
      cr.metadata,
      (1 - (cr.embedding <=> query_embedding))::float AS similarity
    FROM category_recent cr
    WHERE (1 - (cr.embedding <=> query_embedding)) >= 0.55
    ORDER BY similarity DESC
    LIMIT match_count;

    GET DIAGNOSTICS result_count = ROW_COUNT;
    IF result_count > 0 THEN
      RAISE NOTICE 'Category Search - Attempt 2 SUCCESS: % results', result_count;
      RETURN;
    END IF;

  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Category Search - Attempt 2 FAILED: %', SQLERRM;
  END;

  -- ATTEMPT 3: Last 30 days emergency (15s)
  BEGIN
    SET LOCAL statement_timeout = '15s';

    RAISE NOTICE 'Category Search - Attempt 3: Last 30 days (emergency)';

    RETURN QUERY
    SELECT
      d.id,
      d.content,
      d.metadata,
      (1 - (d.embedding <=> query_embedding))::float AS similarity
    FROM document_chunks_meetings d
    WHERE
      d.team_id = match_team_id
      AND d.document_category = match_category
      AND d.document_date >= CURRENT_DATE - INTERVAL '30 days'
      AND (1 - (d.embedding <=> query_embedding)) >= 0.60
    ORDER BY d.document_date DESC
    LIMIT match_count;

    GET DIAGNOSTICS result_count = ROW_COUNT;
    RAISE NOTICE 'Category Search - Attempt 3 COMPLETE: % results', result_count;
    RETURN;

  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Category Search - All attempts FAILED: %', SQLERRM;
      RETURN;
  END;

END;
$function$;

-- Add comment
COMMENT ON FUNCTION public.match_documents_meetings_by_category IS
'Optimized meeting search for when a specific category is provided.
Category filtering reduces dataset significantly, allowing longer timeframes.
Attempt 1: Last 90 days (30s)
Attempt 2: Last 180 days (40s)
Attempt 3: Last 30 days emergency (15s)
Requires match_category to be non-empty.';
