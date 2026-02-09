/*
  # Add source_id column to document_chunks_financial

  1. Purpose
    - Add source_id column to document_chunks_financial table for consistency with other chunk tables
    - Backfill existing records with source_id values (copy from document_id)
    - Enable proper document deletion by source_id
    
  2. Changes
    - Add source_id column to document_chunks_financial
    - Backfill source_id from document_id column
    - Create indexes on source_id for better query performance
    
  3. Security
    - No changes to RLS policies needed
*/

-- Add source_id column to document_chunks_financial
ALTER TABLE document_chunks_financial 
ADD COLUMN IF NOT EXISTS source_id text;

-- Backfill source_id from document_id column
-- In document_chunks_financial, document_id already contains what we need as source_id
UPDATE document_chunks_financial
SET source_id = document_id
WHERE source_id IS NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_document_chunks_financial_source_id 
ON document_chunks_financial(source_id);

-- Create composite index for team_id and source_id (used in delete queries)
CREATE INDEX IF NOT EXISTS idx_document_chunks_financial_team_source 
ON document_chunks_financial(team_id, source_id);
