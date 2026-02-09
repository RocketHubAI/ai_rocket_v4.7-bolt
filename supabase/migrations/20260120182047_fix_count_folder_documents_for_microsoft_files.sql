/*
  # Fix count_folder_documents for Microsoft Files

  1. Problem
    - Microsoft files have synced_from_folder_name and parent_folder_name as NULL
    - The folder name is stored in the folder_path column (e.g., /drives/.../root:/FolderName)
    - Current function only checks synced_from_folder_name and parent_folder_name

  2. Solution
    - Update function to also check if folder_path ends with the folder name
    - This handles Microsoft files where folder info is in the path

  3. Changes
    - Added check for folder_path LIKE '%/' || p_folder_name
*/

CREATE OR REPLACE FUNCTION count_folder_documents(p_team_id UUID, p_folder_name TEXT)
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
      OR (synced_from_folder_name IS NULL AND parent_folder_name = p_folder_name)
      OR (synced_from_folder_name IS NULL AND parent_folder_name IS NULL AND folder_path LIKE '%:/' || p_folder_name)
    );

  RETURN COALESCE(doc_count, 0);
END;
$$;
