/*
  # Fix get_team_documents_list to Include Microsoft Files

  1. Problem
    - Microsoft OneDrive/SharePoint files have microsoft_file_id instead of google_file_id
    - Current function only checks for source_id OR google_file_id
    - Microsoft files are excluded because both are null for them

  2. Solution
    - Update WHERE clause to include microsoft_file_id
    - Update COALESCE to use microsoft_file_id as fallback
    - Ensures all providers (Google, Microsoft, local uploads) are included

  3. Impact
    - Microsoft files will now appear in the documents list
    - Document count will correctly include Microsoft files
    - No change for existing Google Drive and local upload files
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
    COALESCE(dc.source_id, dc.google_file_id, dc.microsoft_file_id) as google_file_id,
    MAX(dc.file_name) as file_name,
    MODE() WITHIN GROUP (ORDER BY dc.doc_category)::text as category,
    MAX(dc.file_size) as file_size,
    MAX(dc.mime_type) as mime_type,
    MIN(dc.created_at) as synced_at,
    MAX(dc.file_modified_at) as file_modified_at,
    COUNT(*) as chunk_count,
    MAX(COALESCE(dc.upload_source, dc.provider, 'google_drive'))::text as source_type
  FROM document_chunks dc
  WHERE dc.team_id = p_team_id
    AND (dc.source_id IS NOT NULL OR dc.google_file_id IS NOT NULL OR dc.microsoft_file_id IS NOT NULL)
  GROUP BY COALESCE(dc.source_id, dc.google_file_id, dc.microsoft_file_id)
  ORDER BY synced_at DESC;
END;
$$;
