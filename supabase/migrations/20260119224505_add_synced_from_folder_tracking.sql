/*
  # Add synced_from_folder tracking to document_chunks

  1. New Columns
    - `synced_from_folder_id` (text) - The Google Drive folder ID that this document was synced from
    - `synced_from_folder_name` (text) - The name of the connected folder this document was synced from
    
  2. Changes
    - These columns track which top-level connected folder a document belongs to
    - This enables accurate counting and deletion of documents by connected folder
    - Works for files in subfolders, not just direct children
    
  3. Index
    - Added index on (team_id, synced_from_folder_name) for efficient queries
    
  4. Function Updates
    - Updated count_folder_documents to use synced_from_folder_name with fallback to parent_folder_name
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'document_chunks' AND column_name = 'synced_from_folder_id'
  ) THEN
    ALTER TABLE document_chunks ADD COLUMN synced_from_folder_id TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'document_chunks' AND column_name = 'synced_from_folder_name'
  ) THEN
    ALTER TABLE document_chunks ADD COLUMN synced_from_folder_name TEXT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_document_chunks_synced_from_folder 
ON document_chunks(team_id, synced_from_folder_name);

DROP FUNCTION IF EXISTS count_folder_documents(UUID, TEXT);

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
  SELECT COUNT(DISTINCT COALESCE(google_file_id, microsoft_file_id, id::text)) INTO doc_count
  FROM document_chunks
  WHERE team_id = p_team_id
    AND (
      synced_from_folder_name = p_folder_name
      OR (synced_from_folder_name IS NULL AND parent_folder_name = p_folder_name)
    );
  
  RETURN COALESCE(doc_count, 0);
END;
$$;

COMMENT ON COLUMN document_chunks.synced_from_folder_id IS 'The Google Drive/Microsoft folder ID that this document was synced from (top-level connected folder)';
COMMENT ON COLUMN document_chunks.synced_from_folder_name IS 'The name of the connected folder this document was synced from - used for folder removal';