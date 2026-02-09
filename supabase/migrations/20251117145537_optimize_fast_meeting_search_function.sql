/*
  # Optimize match_documents_filtered_recency_weighted_fast Function
  
  1. Problem
    - This function is used by default for meeting searches
    - Currently timing out with large datasets (14,000+ chunks)
    - No proper indexing strategy
  
  2. Solution
    - Add aggressive performance optimizations
    - Reduce initial fetch size dramatically
    - Add similarity threshold filter early
    - Increase timeout to 180s
    - Use simpler calculations
  
  3. Changes
    - Optimize match_documents_filtered_recency_weighted_fast
    - Add early similarity filtering
    - Reduce computational complexity
*/

CREATE OR REPLACE FUNCTION public.match_documents_filtered_recency_weighted_fast(
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
  initial_limit int;
  min_similarity float;
BEGIN
  -- Increase timeout to 180 seconds
  SET LOCAL statement_timeout = '180s';
  
  -- Extract parameters
  match_team_id := COALESCE((filter->>'match_team_id')::uuid, (filter->>'team_id')::uuid);
  match_category := COALESCE((filter->>'match_category')::text, '');
  recency_weight := COALESCE((filter->>'recency_weight')::float, 0.15);
  max_days_old := COALESCE((filter->>'max_days_old')::int, 365);
  min_similarity := 0.5;  -- Filter out low-relevance results early
  
  -- Aggressive limit: Only fetch 1.5x what we need, max 500
  initial_limit := LEAST(match_count * 1.5, 500)::int;
  
  -- Validate team_id
  IF match_team_id IS NULL THEN
    RAISE EXCEPTION 'Missing required parameter: team_id';
  END IF;
  
  RETURN QUERY
  WITH recent_docs AS (
    -- Step 1: Get recent documents using index
    SELECT 
      d.id,
      d.content,
      d.metadata,
      d.embedding,
      d.document_date,
      EXTRACT(EPOCH FROM (CURRENT_DATE - d.document_date)) / 86400.0 AS days_old
    FROM document_chunks_meetings d
    WHERE 
      d.team_id = match_team_id
      AND (match_category = '' OR d.document_category = match_category)
      AND d.document_date >= CURRENT_DATE - (max_days_old || ' days')::interval
    ORDER BY d.document_date DESC
    LIMIT initial_limit
  ),
  scored_docs AS (
    -- Step 2: Calculate similarity and filter immediately
    SELECT 
      rd.id,
      rd.content,
      rd.metadata,
      (1 - (rd.embedding <=> query_embedding))::float AS base_similarity,
      GREATEST(0, 1 - (rd.days_old / max_days_old))::float AS recency_score,
      rd.document_date
    FROM recent_docs rd
    WHERE (1 - (rd.embedding <=> query_embedding)) >= min_similarity
  )
  -- Step 3: Simple hybrid scoring
  SELECT 
    sd.id,
    sd.content,
    sd.metadata,
    ((sd.base_similarity * (1 - recency_weight)) + (sd.recency_score * recency_weight))::float AS similarity
  FROM scored_docs sd
  ORDER BY 
    sd.document_date DESC,
    similarity DESC
  LIMIT match_count;
END;
$function$;
