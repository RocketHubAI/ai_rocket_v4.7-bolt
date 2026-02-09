/*
  # Add source_id column to document_chunks tables
  
  1. Changes
    - Add source_id column to both document_chunks_meetings and document_chunks_strategy
    - Extract and populate from metadata->>'source_id'
    - Add indexes for performance
    
  2. Benefits
    - Direct column access (faster than JSONB extraction)
    - Easy to count unique documents
    - Simpler queries for grouping chunks by document
    - Better query performance with proper indexes
*/

-- Add source_id column to document_chunks_meetings
ALTER TABLE document_chunks_meetings
ADD COLUMN IF NOT EXISTS source_id TEXT;

-- Add source_id column to document_chunks_strategy
ALTER TABLE document_chunks_strategy
ADD COLUMN IF NOT EXISTS source_id TEXT;

-- Backfill source_id from metadata
UPDATE document_chunks_meetings
SET source_id = metadata->>'source_id'
WHERE source_id IS NULL AND metadata->>'source_id' IS NOT NULL;

UPDATE document_chunks_strategy
SET source_id = metadata->>'source_id'
WHERE source_id IS NULL AND metadata->>'source_id' IS NOT NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_document_chunks_meetings_source_id 
ON document_chunks_meetings(source_id);

CREATE INDEX IF NOT EXISTS idx_document_chunks_strategy_source_id 
ON document_chunks_strategy(source_id);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_document_chunks_meetings_team_source 
ON document_chunks_meetings(team_id, source_id);

CREATE INDEX IF NOT EXISTS idx_document_chunks_strategy_team_source 
ON document_chunks_strategy(team_id, source_id);
