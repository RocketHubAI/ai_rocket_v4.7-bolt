/*
  # Backfill missing documents from chunk tables - Handle duplicates
  
  1. Purpose
    - Insert documents that exist in chunk tables but missing from documents table
    - Handle unique constraint on source_id (doesn't include team_id)
    
  2. Process
    - Find documents missing from documents table
    - Use ON CONFLICT to skip duplicates
    
  3. Notes
    - 41 documents are missing from documents table
    - 3 chunks have null team_id that need to be fixed separately
*/

-- Insert missing documents from meetings chunks
INSERT INTO documents (
  source_type,
  source_id,
  document_type,
  title,
  content,
  content_hash,
  processing_timestamp,
  team_id,
  folder_type,
  metadata,
  created_at,
  updated_at
)
SELECT DISTINCT ON (metadata->>'source_id')
  'google_drive' as source_type,
  metadata->>'source_id' as source_id,
  'misc_meetings' as document_type,
  title,
  '[Content reconstructed from chunks - original content not available]' as content,
  md5(metadata->>'source_id') as content_hash,
  MIN(document_date) OVER (PARTITION BY metadata->>'source_id') as processing_timestamp,
  team_id,
  'meetings' as folder_type,
  jsonb_build_object(
    'backfilled', true,
    'backfill_date', NOW(),
    'source', 'document_chunks_meetings'
  ) as metadata,
  MIN(document_date) OVER (PARTITION BY metadata->>'source_id') as created_at,
  NOW() as updated_at
FROM document_chunks_meetings
WHERE metadata->>'source_id' IS NOT NULL
  AND team_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM documents d 
    WHERE d.source_id = metadata->>'source_id'
  )
ON CONFLICT (source_id) DO NOTHING;

-- Insert missing documents from strategy chunks
INSERT INTO documents (
  source_type,
  source_id,
  document_type,
  title,
  content,
  content_hash,
  processing_timestamp,
  team_id,
  folder_type,
  metadata,
  created_at,
  updated_at
)
SELECT DISTINCT ON (metadata->>'source_id')
  'google_drive' as source_type,
  metadata->>'source_id' as source_id,
  'key_strategy' as document_type,
  title,
  '[Content reconstructed from chunks - original content not available]' as content,
  md5(metadata->>'source_id') as content_hash,
  MIN(document_date) OVER (PARTITION BY metadata->>'source_id') as processing_timestamp,
  team_id,
  'strategy' as folder_type,
  jsonb_build_object(
    'backfilled', true,
    'backfill_date', NOW(),
    'source', 'document_chunks_strategy'
  ) as metadata,
  MIN(document_date) OVER (PARTITION BY metadata->>'source_id') as created_at,
  NOW() as updated_at
FROM document_chunks_strategy
WHERE metadata->>'source_id' IS NOT NULL
  AND team_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM documents d 
    WHERE d.source_id = metadata->>'source_id'
  )
ON CONFLICT (source_id) DO NOTHING;

-- Fix null team_id in chunks tables by matching with documents table
UPDATE document_chunks_meetings
SET team_id = d.team_id
FROM documents d
WHERE document_chunks_meetings.team_id IS NULL
  AND d.source_id = document_chunks_meetings.metadata->>'source_id';

UPDATE document_chunks_strategy
SET team_id = d.team_id
FROM documents d
WHERE document_chunks_strategy.team_id IS NULL
  AND d.source_id = document_chunks_strategy.metadata->>'source_id';
