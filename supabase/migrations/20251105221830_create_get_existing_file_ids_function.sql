/*
  # Create function to get existing file IDs for deduplication

  1. New Function
    - `get_existing_file_ids(p_team_id uuid)`
    - Returns table of source_id and last_processed timestamp
    - Queries both document_chunks_meetings and document_chunks_strategy
    - Used by n8n workflow to filter out already-processed files
  
  2. Purpose
    - Prevents re-downloading and re-processing existing documents
    - Enables incremental sync by comparing modified dates
    - Improves workflow performance and scalability
*/

CREATE OR REPLACE FUNCTION get_existing_file_ids(p_team_id uuid)
RETURNS TABLE(source_id text, last_processed timestamp) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT 
    metadata->>'source_id' as source_id,
    MAX(document_date)::timestamp as last_processed
  FROM (
    SELECT metadata, document_date 
    FROM document_chunks_meetings 
    WHERE team_id = p_team_id
    UNION ALL
    SELECT metadata, document_date 
    FROM document_chunks_strategy 
    WHERE team_id = p_team_id
  ) combined
  WHERE metadata->>'source_id' IS NOT NULL
  GROUP BY metadata->>'source_id';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
