/*
  # Fix count_folder_documents to use folder ID for accurate counting

  1. Problem
    - Google Drive documents in subfolders may have parent_folder_name set to 
      the immediate parent subfolder, not the top-level connected folder
    - This causes folders with files only in subfolders to show 0 documents
    - The synced_from_folder_id column stores the connected folder ID but isn't being used

  2. Solution
    - Create a new overloaded function that accepts folder_id parameter
    - Check synced_from_folder_id against the connected folder ID
    - Fall back to existing name-based matching for backwards compatibility

  3. Changes
    - Add new function signature that accepts folder_id
    - Update original function to call new implementation
*/

CREATE OR REPLACE FUNCTION count_folder_documents(
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
      OR (synced_from_folder_name IS NULL AND synced_from_folder_id IS NULL AND parent_folder_name IS NULL AND folder_path LIKE '%:/' || p_folder_name)
      OR (synced_from_folder_name IS NULL AND synced_from_folder_id IS NULL AND parent_folder_name IS NULL AND folder_path LIKE '%/' || p_folder_name || '/%')
      OR (synced_from_folder_name IS NULL AND synced_from_folder_id IS NULL AND parent_folder_name IS NULL AND folder_path LIKE '%/' || p_folder_name)
    );

  RETURN COALESCE(doc_count, 0);
END;
$$;
