/*
  # Drop and recreate count_folder_documents with multiple matching strategies

  1. Problem
    - Multiple function signatures exist causing ambiguity
    - Need to consolidate into a single robust function

  2. Solution
    - Drop all existing versions
    - Create single function with optional folder_id parameter
    - Use multiple matching strategies for both providers

  3. Matching Strategies
    - synced_from_folder_name (explicit tracking)
    - synced_from_folder_id (explicit tracking by ID)
    - parent_folder_name (for root-level files)
    - folder_path patterns (Microsoft: %:/FolderName, Google: //FolderName)
*/

DROP FUNCTION IF EXISTS count_folder_documents(UUID, TEXT);
DROP FUNCTION IF EXISTS count_folder_documents(UUID, TEXT, TEXT);

CREATE FUNCTION count_folder_documents(
  p_team_id UUID,
  p_folder_name TEXT,
  p_folder_id TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  doc_count INTEGER;
BEGIN
  SELECT COUNT(DISTINCT COALESCE(google_file_id, microsoft_file_id, id::text)) INTO doc_count
  FROM document_chunks
  WHERE team_id = p_team_id
    AND (
      synced_from_folder_name = p_folder_name
      OR synced_from_folder_id = p_folder_id
      OR (synced_from_folder_name IS NULL AND synced_from_folder_id IS NULL AND parent_folder_name = p_folder_name)
      OR (synced_from_folder_name IS NULL AND synced_from_folder_id IS NULL AND folder_path LIKE '%:/' || p_folder_name)
      OR (synced_from_folder_name IS NULL AND synced_from_folder_id IS NULL AND folder_path LIKE '%:/' || p_folder_name || '/%')
      OR (synced_from_folder_name IS NULL AND synced_from_folder_id IS NULL AND folder_path = '//' || p_folder_name)
      OR (synced_from_folder_name IS NULL AND synced_from_folder_id IS NULL AND folder_path LIKE '//' || p_folder_name || '/%')
    );

  RETURN COALESCE(doc_count, 0);
END;
$$;

COMMENT ON FUNCTION count_folder_documents(UUID, TEXT, TEXT) IS 'Counts unique documents synced from a connected folder. Uses multiple strategies: synced_from columns, parent_folder_name, and folder_path patterns for both Google Drive and Microsoft OneDrive.';
