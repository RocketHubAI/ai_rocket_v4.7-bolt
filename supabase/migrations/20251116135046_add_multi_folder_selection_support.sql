/*
  # Add Multi-Folder Selection Support to Google Drive Connections

  ## Overview
  Adds support for selecting multiple folders per folder type (strategy, meetings, financial)
  to enable more flexible data sync configurations.

  ## Changes
  1. Add new columns to `user_drive_connections`:
     - `selected_strategy_folder_ids` (jsonb) - Array of strategy folder IDs
     - `selected_meetings_folder_ids` (jsonb) - Array of meetings folder IDs
     - `selected_financial_folder_ids` (jsonb) - Array of financial folder IDs

  ## Migration Strategy
  - Add new columns with default empty arrays
  - Migrate existing single folder IDs to array format
  - Keep existing single folder columns for backward compatibility

  ## Important Notes
  - This is additive only - no data loss
  - Existing integrations will continue to work
  - New guided setup will use array columns
*/

-- Add new array-based folder ID columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_drive_connections' AND column_name = 'selected_strategy_folder_ids'
  ) THEN
    ALTER TABLE user_drive_connections ADD COLUMN selected_strategy_folder_ids jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_drive_connections' AND column_name = 'selected_meetings_folder_ids'
  ) THEN
    ALTER TABLE user_drive_connections ADD COLUMN selected_meetings_folder_ids jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_drive_connections' AND column_name = 'selected_financial_folder_ids'
  ) THEN
    ALTER TABLE user_drive_connections ADD COLUMN selected_financial_folder_ids jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Migrate existing single folder IDs to array format (if they exist and arrays are empty)
UPDATE user_drive_connections
SET selected_strategy_folder_ids = jsonb_build_array(strategy_folder_id)
WHERE strategy_folder_id IS NOT NULL 
  AND (selected_strategy_folder_ids = '[]'::jsonb OR selected_strategy_folder_ids IS NULL);

UPDATE user_drive_connections
SET selected_meetings_folder_ids = jsonb_build_array(meetings_folder_id)
WHERE meetings_folder_id IS NOT NULL 
  AND (selected_meetings_folder_ids = '[]'::jsonb OR selected_meetings_folder_ids IS NULL);

UPDATE user_drive_connections
SET selected_financial_folder_ids = jsonb_build_array(financial_folder_id)
WHERE financial_folder_id IS NOT NULL 
  AND (selected_financial_folder_ids = '[]'::jsonb OR selected_financial_folder_ids IS NULL);

-- Add helpful comments
COMMENT ON COLUMN user_drive_connections.selected_strategy_folder_ids IS 'Array of Google Drive folder IDs for strategy documents';
COMMENT ON COLUMN user_drive_connections.selected_meetings_folder_ids IS 'Array of Google Drive folder IDs for meeting documents';
COMMENT ON COLUMN user_drive_connections.selected_financial_folder_ids IS 'Array of Google Drive folder IDs for financial documents';
