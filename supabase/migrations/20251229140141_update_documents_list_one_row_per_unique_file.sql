/*
  # Update get_team_documents_list to Show One Row Per Unique File

  1. Problem
    - Currently groups by file + category, showing same file multiple times
    - Results in 620 rows when there are only 612 unique files
    - Confusing to users who see duplicate file names

  2. Solution
    - Remove doc_category from GROUP BY clause
    - Use MODE() aggregate to pick the most common category for each file
    - Each unique file now appears exactly once
    - Consistent with document counts shown elsewhere (Admin Dashboard, Fuel Stage)

  3. Impact
    - Documents list will show 612 unique files instead of 620 entries
    - Each file shows its primary/most common category
    - Counts match across all UI locations
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
    MAX(dc.file_name) as file_name,
    MODE() WITHIN GROUP (ORDER BY dc.doc_category)::text as category,
    MAX(dc.file_size) as file_size,
    MAX(dc.mime_type) as mime_type,
    MIN(dc.created_at) as synced_at,
    MAX(dc.file_modified_at) as file_modified_at,
    COUNT(*) as chunk_count,
    MAX(COALESCE(dc.upload_source, 'google_drive'))::text as source_type
  FROM document_chunks dc
  WHERE dc.team_id = p_team_id
    AND (dc.source_id IS NOT NULL OR dc.google_file_id IS NOT NULL)
  GROUP BY COALESCE(dc.source_id, dc.google_file_id)
  ORDER BY synced_at DESC;
END;
$$;
