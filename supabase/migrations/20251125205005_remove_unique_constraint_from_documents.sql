/*
  # Remove Unique Constraint from Documents Table
  
  1. Changes
    - Remove the UNIQUE constraint on documents.source_id
    - This allows temporary duplicate entries until workflow is updated
    - Will be re-added later along with document_chunks constraints
  
  2. Notes
    - Constraint will be re-added when workflow is updated with ON CONFLICT handling
    - Document chunks tables will also need similar constraints in future migration
*/

-- Remove the unique constraint
ALTER TABLE documents 
DROP CONSTRAINT IF EXISTS documents_source_id_unique;
