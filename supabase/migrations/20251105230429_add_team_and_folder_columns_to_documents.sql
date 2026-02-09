/*
  # Add team_id and folder_type columns to documents table

  1. Changes
    - Add `team_id` column to track which team owns the document
    - Add `folder_type` column to categorize documents (strategy, meetings, etc.)
    - Both columns are nullable to support existing records
    - Add indexes for faster queries

  2. Purpose
    - Enable team-based document access control
    - Support folder-based organization and filtering
    - Allow efficient queries by team and folder type
*/

-- Add team_id column to documents table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'documents'
      AND column_name = 'team_id'
  ) THEN
    ALTER TABLE documents ADD COLUMN team_id UUID;
  END IF;
END $$;

-- Add folder_type column to documents table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'documents'
      AND column_name = 'folder_type'
  ) THEN
    ALTER TABLE documents ADD COLUMN folder_type VARCHAR;
  END IF;
END $$;

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_documents_team_id ON documents(team_id);
CREATE INDEX IF NOT EXISTS idx_documents_folder_type ON documents(folder_type);
CREATE INDEX IF NOT EXISTS idx_documents_team_folder ON documents(team_id, folder_type);
