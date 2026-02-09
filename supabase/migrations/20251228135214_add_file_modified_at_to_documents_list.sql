/*
  # Add file_modified_at to get_team_documents_list function

  1. Changes
    - Drop and recreate get_team_documents_list function
    - Add file_modified_at to return columns
    - This is the original file date from Google Drive or upload time for local files

  2. Purpose
    - Allow UI to display both File Date and Sync Date
    - Enable sorting by file modification date
*/

DROP FUNCTION IF EXISTS get_team_documents_list(uuid);

CREATE FUNCTION get_team_documents_list(p_team_id uuid)
RETURNS TABLE (
  google_file_id text,
  file_name text,
  category text,
  file_size bigint,
  mime_type text,
  synced_at timestamptz,
  file_modified_at timestamptz,
  chunk_count bigint,
  source_type text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(dc.source_id, dc.google_file_id) as google_file_id,
    dc.file_name,
    dc.doc_category::text as category,
    dc.file_size,
    dc.mime_type,
    MIN(dc.created_at) as synced_at,
    MAX(dc.file_modified_at) as file_modified_at,
    COUNT(*) as chunk_count,
    COALESCE(dc.upload_source, 'google_drive')::text as source_type
  FROM document_chunks dc
  WHERE dc.team_id = p_team_id
    AND (dc.source_id IS NOT NULL OR dc.google_file_id IS NOT NULL)
  GROUP BY 
    COALESCE(dc.source_id, dc.google_file_id),
    dc.file_name,
    dc.doc_category,
    dc.file_size,
    dc.mime_type,
    COALESCE(dc.upload_source, 'google_drive')
  ORDER BY synced_at DESC;
END;
$$;
