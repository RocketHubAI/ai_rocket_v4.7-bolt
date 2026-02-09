/*
  # Fix Meetings Vector Search to Allow Empty Category

  1. Problem
    - The `match_documents_single_category` function requires match_category to be non-empty
    - When category is empty string, it throws an exception instead of searching all categories
    - This prevents broad queries like "recent team action items" from working

  2. Solution
    - Remove the validation that blocks empty category
    - When category is empty, search ALL categories for the team
    - Still require team_id to be present

  3. Impact
    - Enables searching across all meeting types when no specific type is requested
    - Maintains team isolation (still requires team_id)
    - More flexible for general queries
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
      -- FIXED: Only filter by category if it's not empty
      AND (match_category = '' OR d.document_category = match_category)
      AND d.document_date >= CURRENT_DATE - (max_days_old || ' days')::interval
    ORDER BY d.document_date DESC, d.id ASC
    LIMIT match_count * 3
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
