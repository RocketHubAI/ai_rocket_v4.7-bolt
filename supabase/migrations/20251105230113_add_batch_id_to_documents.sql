/*
  # Add batch_id column to documents table

  1. Changes
    - Add `batch_id` column to `documents` table
    - Column is nullable to support existing records
    - Type is VARCHAR to match workflow data

  2. Purpose
    - Allows n8n workflow to track which batch processing run created/updated each document
    - Enables querying documents by batch for debugging and monitoring
    - Supports future batch-based operations (reprocessing, rollback, etc.)
*/

-- Add batch_id column to documents table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'documents'
      AND column_name = 'batch_id'
  ) THEN
    ALTER TABLE documents ADD COLUMN batch_id VARCHAR;
  END IF;
END $$;

-- Add index for faster batch queries
CREATE INDEX IF NOT EXISTS idx_documents_batch_id ON documents(batch_id);
