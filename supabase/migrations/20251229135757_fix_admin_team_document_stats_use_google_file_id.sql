/*
  # Fix Admin Team Document Stats to Use Correct Unique File Count

  1. Problem
    - The function was using COUNT(DISTINCT document_id) which includes duplicates
    - Same file synced multiple times creates multiple document_ids
    - This caused inflated counts (e.g., 728 instead of 612)

  2. Solution
    - Use COALESCE(source_id, google_file_id) to count unique files
    - source_id is the newer unified identifier (for both Drive and local uploads)
    - Falls back to google_file_id for older records where source_id is NULL
    - This matches the counting method used in get_document_sync_stats()

  3. Impact
    - Admin Dashboard "Documents by Team" will now show accurate unique file counts
    - Consistent with "Your Data" counts shown to users
*/

CREATE OR REPLACE FUNCTION get_admin_team_document_stats()
RETURNS TABLE (
  team_id uuid,
  doc_count bigint,
  chunk_count bigint
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    team_id,
    COUNT(DISTINCT COALESCE(source_id, google_file_id)) as doc_count,
    COUNT(*) as chunk_count
  FROM document_chunks
  WHERE team_id IS NOT NULL 
    AND (source_id IS NOT NULL OR google_file_id IS NOT NULL)
  GROUP BY team_id;
$$;
