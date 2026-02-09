/*
  # Update get_existing_file_ids to use documents table
  
  1. Changes
    - Simplify function to query documents table instead of chunk tables
    - More reliable and performant
    - Single source of truth
    
  2. Benefits
    - Simpler query logic
    - Better performance (no JSONB extraction)
    - Matches the actual document processing workflow
*/

CREATE OR REPLACE FUNCTION get_existing_file_ids(p_team_id uuid)
RETURNS TABLE(source_id text, last_processed timestamp) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.source_id::text,
    d.updated_at::timestamp as last_processed
  FROM documents d
  WHERE d.team_id = p_team_id
    AND d.source_id IS NOT NULL
    AND d.source_type = 'google_drive';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
