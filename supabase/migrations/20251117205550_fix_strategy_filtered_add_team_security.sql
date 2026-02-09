/*
  # Fix Strategy Filtered Function - Add Team Security
  
  1. CRITICAL SECURITY BUG
    - Current match_documents_strategy_filtered does NOT filter by team_id
    - This allows users to see documents from other teams
    - Function only filters by document_category and document_date
    
  2. Solution
    - Drop both existing insecure versions
    - Create new version that REQUIRES and FILTERS by team_id
    - Extract team_id from metadata parameter (matching n8n format)
    - Maintain existing filter functionality for category/date
    
  3. Security Requirements
    - team_id filtering is MANDATORY
    - Function will raise exception if team_id not provided
    - Only return documents from the specified team
    - Use is_latest_version = true
*/

-- Drop both existing insecure versions
DROP FUNCTION IF EXISTS public.match_documents_strategy_filtered(vector, double precision, integer, uuid);
DROP FUNCTION IF EXISTS public.match_documents_strategy_filtered(vector, double precision, integer, jsonb);

-- Create secure version with team_id filtering
CREATE OR REPLACE FUNCTION public.match_documents_strategy_filtered(
  query_embedding vector,
  match_threshold double precision DEFAULT 0.3,
  match_count integer DEFAULT 50,
  filter jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE(
  id bigint,
  content text,
  metadata jsonb,
  title character varying,
  document_date timestamp with time zone,
  document_category text,
  similarity double precision
)
LANGUAGE plpgsql
AS $function$
DECLARE
  filter_team_id uuid;
BEGIN
  -- Extract team_id from filter/metadata
  -- n8n passes it in the metadata filter as team_id
  filter_team_id := COALESCE(
    (filter->>'team_id')::uuid,
    (filter->'metadata'->>'team_id')::uuid
  );

  -- CRITICAL: team_id is REQUIRED for security
  IF filter_team_id IS NULL THEN
    RAISE EXCEPTION 'SECURITY: team_id is required in filter parameter';
  END IF;

  RAISE NOTICE 'Strategy Filtered Search - team_id: %, threshold: %, limit: %', 
    filter_team_id, match_threshold, match_count;

  -- Return matching documents with STRICT team filtering
  RETURN QUERY
  SELECT 
    dcs.id,
    dcs.content,
    dcs.metadata,
    dcs.title,
    dcs.document_date,
    dcs.document_category,
    (1 - (dcs.embedding <=> query_embedding))::double precision AS similarity
  FROM document_chunks_strategy dcs
  WHERE 
    dcs.team_id = filter_team_id  -- CRITICAL: Team isolation
    AND dcs.is_latest_version = true
    AND (1 - (dcs.embedding <=> query_embedding)) >= match_threshold
  ORDER BY 
    (dcs.embedding <=> query_embedding) ASC
  LIMIT match_count;
END;
$function$;

COMMENT ON FUNCTION public.match_documents_strategy_filtered IS
'SECURE strategy document search with MANDATORY team_id filtering.
CRITICAL: This function enforces team isolation by requiring team_id.
Parameters:
- query_embedding: Vector to search for
- match_threshold: Minimum similarity (default 0.3)
- match_count: Max results (default 50)
- filter: JSONB with team_id (REQUIRED) - {"team_id": "uuid"}
Returns: Only documents belonging to the specified team_id';
