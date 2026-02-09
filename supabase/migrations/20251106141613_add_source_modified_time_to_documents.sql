/*
  # Add source_modified_time column to documents table

  1. Changes
    - Add `source_modified_time` column to `documents` table
      - Stores the original source's last modified timestamp (e.g., Google Drive file's modifiedTime)
      - Used to detect if source content has changed since last processing
      - Enables efficient incremental syncing by comparing Drive's modified_time with stored value
  
  2. Benefits
    - Accurate change detection for source documents
    - Avoid re-processing unchanged files
    - Reduce unnecessary API calls and embedding generation costs
  
  3. Migration Strategy
    - Add column with NULL default (existing rows will have NULL)
    - Future inserts will populate this field from source metadata
    - Workflow will use this field to filter new/updated files
*/

-- Add source_modified_time column to documents table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'documents' 
    AND column_name = 'source_modified_time'
  ) THEN
    ALTER TABLE documents 
    ADD COLUMN source_modified_time timestamptz;
    
    -- Create index for efficient filtering queries
    CREATE INDEX IF NOT EXISTS idx_documents_source_modified 
    ON documents(source_id, source_modified_time);
  END IF;
END $$;