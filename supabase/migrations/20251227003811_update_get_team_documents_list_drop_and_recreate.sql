/*
  # Update get_team_documents_list to Include Source Type

  1. Changes
    - Drop existing function
    - Recreate with source_type field to distinguish between Google Drive and local uploads
    - Update query to include both upload_source types
    - Use COALESCE for document ID to support both sources

  2. Impact
    - Documents list will now show whether files are from Google Drive or local uploads
    - Enables filtering and sorting by source type
*/

-- Drop the existing function
DROP FUNCTION IF EXISTS get_team_documents_list(uuid);

-- Recreate with source_type field
CREATE FUNCTION get_team_documents_list(p_team_id uuid)
RETURNS TABLE (
  google_file_id text,
  file_name text,
  category text,
  file_size bigint,
  mime_type text,
  synced_at timestamptz,
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
