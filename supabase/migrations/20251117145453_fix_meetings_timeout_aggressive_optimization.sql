/*
  # Aggressive Optimization for Meeting Search Timeouts

  1. Problem
    - Meeting searches timing out even with 120s timeout
    - Searching across 14,000+ document chunks is too slow
    - The `match_documents_filtered_recency_weighted_fast` function is still too complex

  2. Root Cause
    - No proper index on (team_id, document_date DESC)
    - Recency weighting calculation happening on too many rows
    - Not leveraging PostgreSQL's index scan optimization
  
  3. Solution
    - Create composite index on (team_id, document_date DESC) for meetings
    - Drastically reduce initial filter multiplier (1.5x instead of 2x)
    - Use simpler scoring for faster execution
    - Set timeout to 180 seconds as absolute fallback
  
  4. Changes
    - Add missing index on document_chunks_meetings
    - Update match_documents_single_category with aggressive optimizations
    - Simplify hybrid scoring calculation
*/

-- Create composite index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_meetings_team_date_desc 
ON document_chunks_meetings(team_id, document_date DESC);

-- Create index on category for filtered searches
CREATE INDEX IF NOT EXISTS idx_meetings_team_category_date 
ON document_chunks_meetings(team_id, document_category, document_date DESC);

-- Optimize the function with aggressive performance improvements
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
  initial_limit int;
BEGIN
  -- Increase statement timeout to 180 seconds as absolute max
  SET LOCAL statement_timeout = '180s';
  
  -- Extract parameters from filter JSON
  match_category := COALESCE((filter->>'match_category')::text, '');
  match_team_id := COALESCE((filter->>'match_team_id')::uuid, (filter->>'team_id')::uuid);
  recency_weight := COALESCE((filter->>'recency_weight')::float, 0.25);
  max_days_old := COALESCE((filter->>'max_days_old')::int, 365);
  
  -- Aggressive limit reduction: 1.5x instead of 2x
  initial_limit := LEAST(match_count * 1.5, 500)::int;
  
  -- Validate ONLY team_id is required
  IF match_team_id IS NULL THEN
    RAISE EXCEPTION 'Missing required parameter: team_id';
  END IF;
  
  RETURN QUERY
  WITH filtered_docs AS (
    -- Step 1: Use index scan for fastest possible filtering
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
      AND d.document_date >= CURRENT_DATE - (max_days_old || ' days')::interval
    ORDER BY d.document_date DESC
    LIMIT initial_limit
  ),
  scored_docs AS (
    -- Step 2: Calculate only necessary scores
    SELECT 
      fd.id,
      fd.content,
      fd.metadata,
      (1 - (fd.embedding <=> query_embedding))::float AS base_similarity,
      fd.document_date
    FROM filtered_docs fd
    WHERE (1 - (fd.embedding <=> query_embedding)) > 0.5  -- Filter low similarity early
  )
  -- Step 3: Simple final scoring
  SELECT 
    sd.id,
    sd.content,
    sd.metadata,
    sd.base_similarity AS similarity
  FROM scored_docs sd
  ORDER BY 
    sd.document_date DESC,
    sd.base_similarity DESC
  LIMIT match_count;
END;
$function$;
