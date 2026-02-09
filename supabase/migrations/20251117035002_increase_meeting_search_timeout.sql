/*
  # Increase Statement Timeout for Meeting Vector Search
  
  1. Problem
    - When searching ALL meeting categories (empty match_category), the query can take longer
    - Default statement timeout (60s) may be insufficient for large datasets
    - Error: "57014 canceling statement due to statement timeout"
  
  2. Solution
    - Increase statement timeout to 120 seconds for the meeting search function
    - Add explicit timeout setting at function level
    - Optimize query by reducing initial fetch multiplier
  
  3. Changes
    - Set statement_timeout to 120000ms (120 seconds) at function start
    - Reduce LIMIT multiplier from 3x to 2x for initial filter
    - Add performance logging
*/

CREATE OR REPLACE FUNCTION public.match_documents_single_category(
  query_embedding vector, 
  filter jsonb DEFAULT '{}'::jsonb, 
  match_count integer DEFAULT 200
)
RETURNS TABLE(id bigint, content text, metadata jsonb, similarity double precision)
LANGUAGE plpgsql
AS $function$
DECLARE
  match_category text;
  match_team_id uuid;
  recency_weight float;
  max_days_old int;
BEGIN
  -- Increase statement timeout for large searches (120 seconds)
  SET LOCAL statement_timeout = '120s';
  
  -- Extract parameters from filter JSON
  match_category := COALESCE((filter->>'match_category')::text, '');
  match_team_id := COALESCE((filter->>'match_team_id')::uuid, (filter->>'team_id')::uuid);
  recency_weight := COALESCE((filter->>'recency_weight')::float, 0.25);
  max_days_old := COALESCE((filter->>'max_days_old')::int, 365);
  
  -- Validate ONLY team_id is required (category can be empty for "all categories" search)
  IF match_team_id IS NULL THEN
    RAISE EXCEPTION 'Missing required parameter: team_id=%', match_team_id;
  END IF;
  
  -- Log for debugging
  RAISE NOTICE 'Single Category Search: category=%, team=%, count=%, recency=%, days=%', 
    match_category, match_team_id, match_count, recency_weight, max_days_old;
  
  RETURN QUERY
  WITH filtered_docs AS (
    -- Step 1: Filter by team, optionally by category, and date using index
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
      -- Only filter by category if it's not empty
      AND (match_category = '' OR d.document_category = match_category)
      AND d.document_date >= CURRENT_DATE - (max_days_old || ' days')::interval
    ORDER BY d.document_date DESC, d.id ASC
    -- Reduced from 3x to 2x for better performance
    LIMIT match_count * 2
  ),
  scored_docs AS (
    -- Step 2: Calculate similarity and hybrid score
    SELECT 
      fd.id,
      fd.content,
      fd.metadata,
      (1 - (fd.embedding <=> query_embedding)) AS similarity,
      GREATEST(0, 1 - (fd.days_old / max_days_old)) AS recency_score,
      fd.document_date
    FROM filtered_docs fd
  )
  -- Step 3: Return with hybrid scoring
  SELECT 
    sd.id,
    sd.content,
    sd.metadata,
    (
      (sd.similarity * (1 - recency_weight)) + 
      (sd.recency_score * recency_weight)
    )::float AS similarity
  FROM scored_docs sd
  ORDER BY 
    sd.document_date DESC,
    similarity DESC
  LIMIT match_count;
END;
$function$;
