/*
  # Create Permissive Strategy Search Function for N8N

  1. Problem
    - N8N Vector Store node is not finding strategy documents even though they exist
    - Current function may have too high a similarity threshold
    - Need a more permissive version specifically for strategy document searches

  2. Solution
    - Create a new function with a very low threshold (0.2) for initial matching
    - Ensure it works with n8n's parameter format
    - Use the same filter format as existing functions

  3. Function Behavior
    - Accepts team_id through filter parameter
    - Uses low threshold (0.2) to catch more potential matches
    - Returns up to match_count results ordered by similarity
    - Compatible with n8n Supabase Vector Store node
*/

-- Create a permissive strategy search function for n8n
CREATE OR REPLACE FUNCTION public.match_documents_strategy_permissive(
  query_embedding vector,
  filter jsonb DEFAULT '{}'::jsonb,
  match_count integer DEFAULT 500
)
RETURNS TABLE(
  id bigint,
  content text,
  metadata jsonb,
  title varchar,
  document_date timestamptz,
  similarity double precision
)
LANGUAGE plpgsql
AS $function$
DECLARE
  filter_team_id uuid;
BEGIN
  -- Extract team_id from filter
  filter_team_id := (filter->>'team_id')::uuid;

  -- Validate team_id is present
  IF filter_team_id IS NULL THEN
    RAISE EXCEPTION 'Missing required parameter: team_id in filter';
  END IF;

  -- Return matching documents with VERY LOW threshold for debugging
  RETURN QUERY
  SELECT 
    dcs.id,
    dcs.content,
    dcs.metadata,
    dcs.title,
    dcs.document_date,
    (1 - (dcs.embedding <=> query_embedding))::double precision AS similarity
  FROM document_chunks_strategy dcs
  WHERE 
    dcs.team_id = filter_team_id
    AND dcs.is_latest_version = true
    AND (1 - (dcs.embedding <=> query_embedding)) > 0.2  -- Very permissive threshold
  ORDER BY 
    (dcs.embedding <=> query_embedding) ASC  -- Order by similarity (lower distance = higher similarity)
  LIMIT match_count;
END;
$function$;

-- Add helpful comment
COMMENT ON FUNCTION public.match_documents_strategy_permissive IS
'Permissive strategy document search for n8n debugging.
Uses very low threshold (0.2) to ensure results are found.
Parameters:
- query_embedding: Vector to search for
- filter: JSONB with team_id (required)
- match_count: Max results to return (default 500)';
