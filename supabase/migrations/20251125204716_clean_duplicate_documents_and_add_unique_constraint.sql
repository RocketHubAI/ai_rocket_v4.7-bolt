/*
  # Clean Duplicate Documents and Add Unique Constraint
  
  1. Changes
    - Delete duplicate documents, keeping only the FIRST (oldest) entry per source_id
    - Add UNIQUE constraint to documents.source_id to prevent future duplicates
    - This ensures workflow continues even if it tries to insert existing files
  
  2. Data Integrity
    - Preserves the original document entry (earliest created_at)
    - Removes all subsequent duplicates
    - Prevents future duplicate insertions via database constraint
*/

-- Step 1: Delete duplicates, keeping only the OLDEST entry per source_id
DELETE FROM documents 
WHERE id IN (
  SELECT id 
  FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY source_id 
        ORDER BY created_at ASC  -- Keep the FIRST/oldest entry
      ) as rn
    FROM documents
    WHERE source_id IS NOT NULL
  ) subquery
  WHERE rn > 1  -- Delete all but the first entry
);

-- Step 2: Add unique constraint to prevent future duplicates
ALTER TABLE documents 
ADD CONSTRAINT documents_source_id_unique UNIQUE (source_id);

-- Add helpful comment
COMMENT ON CONSTRAINT documents_source_id_unique ON documents IS 
  'Prevents duplicate document entries from the same Google Drive source_id. Workflow handles UNIQUE violation errors gracefully by continuing execution.';
