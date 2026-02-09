/*
  # Update Category-Optimized Search with Generous Limits

  1. Changes
    - Increase pre-filter limits from 400-500 to 10K-20K
    - Extend timeouts to 30-40s for better coverage
    - When category is specified, dataset is smaller so we can be very generous
    - Target 30-45s execution time

  2. Benefits
    - Can search much further back in time
    - Better recall for category-specific searches
    - Still guaranteed to complete within timeout
*/

-- Drop and recreate with new limits
DROP FUNCTION IF EXISTS public.match_documents_meetings_by_category(vector, jsonb, integer);

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
  max_days_old int;
  recency_weight float;
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

  max_days_old := COALESCE(
    (filter->>'max_days_old')::int,
    180
  );

  recency_weight := COALESCE(
    (filter->>'recency_weight')::float,
    0.25
  );

  -- Validate required params
  IF match_team_id IS NULL THEN
    RAISE EXCEPTION 'Missing required parameter: team_id';
  END IF;

  IF match_category IS NULL OR match_category = '' THEN
    RAISE EXCEPTION 'This function requires a specific category. Use balanced search for all categories.';
  END IF;

  RAISE NOTICE 'Category-Optimized Search - team: %, category: %, max_days: %', 
    match_team_id, match_category, max_days_old;

  -- ATTEMPT 1: Full time range with 20K limit (40s timeout)
  -- Category filtering significantly reduces dataset size
  BEGIN
    SET LOCAL statement_timeout = '40s';

    RAISE NOTICE 'Category Search - Attempt 1: % days, 20K doc limit', max_days_old;

    RETURN QUERY
    WITH category_recent AS (
      SELECT d.id, d.content, d.metadata, d.embedding, d.document_date
      FROM document_chunks_meetings d
      WHERE
        d.team_id = match_team_id
        AND d.document_category = match_category
        AND d.document_date >= CURRENT_DATE - (max_days_old || ' days')::interval
      ORDER BY d.document_date DESC
      LIMIT 20000  -- Much more generous
    ),
    scored_results AS (
      SELECT
        cr.id,
        cr.content,
        cr.metadata,
        (1 - (cr.embedding <=> query_embedding))::float AS base_similarity,
        EXTRACT(EPOCH FROM (CURRENT_DATE - cr.document_date::date)) / 86400.0 AS days_old
      FROM category_recent cr
    )
    SELECT
      sr.id,
      sr.content,
      sr.metadata,
      (sr.base_similarity * (1 - recency_weight) + 
       ((1 - (sr.days_old / NULLIF(max_days_old, 0))) * recency_weight))::float AS similarity
    FROM scored_results sr
    WHERE sr.base_similarity >= 0.50
    ORDER BY similarity DESC
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

  -- ATTEMPT 2: 50% time range, 15K limit (30s timeout)
  BEGIN
    SET LOCAL statement_timeout = '30s';
    
    RAISE NOTICE 'Category Search - Attempt 2: % days, 15K doc limit', max_days_old / 2;

    RETURN QUERY
    WITH category_recent AS (
      SELECT d.id, d.content, d.metadata, d.embedding, d.document_date
      FROM document_chunks_meetings d
      WHERE
        d.team_id = match_team_id
        AND d.document_category = match_category
        AND d.document_date >= CURRENT_DATE - ((max_days_old / 2) || ' days')::interval
      ORDER BY d.document_date DESC
      LIMIT 15000
    ),
    scored_results AS (
      SELECT
        cr.id,
        cr.content,
        cr.metadata,
        (1 - (cr.embedding <=> query_embedding))::float AS base_similarity
      FROM category_recent cr
    )
    SELECT
      sr.id,
      sr.content,
      sr.metadata,
      sr.base_similarity AS similarity
    FROM scored_results sr
    WHERE sr.base_similarity >= 0.55
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

  -- ATTEMPT 3: 30 days, 10K limit (20s timeout - emergency)
  BEGIN
    SET LOCAL statement_timeout = '20s';

    RAISE NOTICE 'Category Search - Attempt 3: 30 days, 10K doc limit (emergency)';

    RETURN QUERY
    SELECT
      d.id,
      d.content,
      d.metadata,
      (1 - (d.embedding <=> query_embedding))::float AS similarity
    FROM (
      SELECT id, content, metadata, embedding
      FROM document_chunks_meetings
      WHERE
        team_id = match_team_id
        AND document_category = match_category
        AND document_date >= CURRENT_DATE - INTERVAL '30 days'
      ORDER BY document_date DESC
      LIMIT 10000
    ) d
    WHERE (1 - (d.embedding <=> query_embedding)) >= 0.60
    ORDER BY similarity DESC
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

-- Update comment
COMMENT ON FUNCTION public.match_documents_meetings_by_category IS
'Category-optimized meeting search targeting 30-45s execution time.
Requires specific category (filters dataset significantly).
Attempt 1: Full time range, 20K docs (40s)
Attempt 2: 50% time range, 15K docs (30s)
Attempt 3: 30 days, 10K docs (20s emergency)
Much more generous than previous version for better recall.';
