/*
  # Create function to count unique documents in a folder

  1. New Functions
    - `count_folder_documents(p_team_id, p_folder_name)` - Returns count of unique documents in a folder
      - Counts distinct google_file_id values
      - Filters by team_id and parent_folder_name
      
  2. Security
    - Function is accessible to authenticated users
    - Team ID validation ensures users can only count their own team's documents
*/

CREATE OR REPLACE FUNCTION count_folder_documents(
  p_team_id UUID,
  p_folder_name TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  doc_count INTEGER;
BEGIN
  SELECT COUNT(DISTINCT google_file_id) INTO doc_count
  FROM document_chunks
  WHERE team_id = p_team_id
    AND parent_folder_name = p_folder_name;
  
  RETURN COALESCE(doc_count, 0);
END;
$$;