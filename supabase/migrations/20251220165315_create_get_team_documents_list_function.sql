/*
  # Create get_team_documents_list Function

  1. New Function
    - `get_team_documents_list(p_team_id uuid)`
      - Returns a list of all unique documents for a team
      - Aggregates data from document_chunks table
      - Groups by google_file_id to get unique documents

  2. Returns
    - google_file_id: unique identifier
    - file_name: document name
    - category: AI-assigned category
    - file_size: file size in bytes
    - mime_type: file MIME type
    - synced_at: when the document was first synced
    - chunk_count: number of chunks for this document
*/

CREATE OR REPLACE FUNCTION get_team_documents_list(p_team_id uuid)
RETURNS TABLE (
  google_file_id text,
  file_name text,
  category text,
  file_size bigint,
  mime_type text,
  synced_at timestamptz,
  chunk_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dc.google_file_id,
    dc.file_name,
    dc.doc_category::text as category,
    dc.file_size,
    dc.mime_type,
    MIN(dc.created_at) as synced_at,
    COUNT(*) as chunk_count
  FROM document_chunks dc
  WHERE dc.team_id = p_team_id
    AND dc.google_file_id IS NOT NULL
  GROUP BY dc.google_file_id, dc.file_name, dc.doc_category, dc.file_size, dc.mime_type
  ORDER BY synced_at DESC;
END;
$$;
