/*
  # Migrate JSONB Folder Data Back to Original Columns

  1. Problem
    - Guided Setup was writing folder data to NEW JSONB array columns:
      - selected_strategy_folder_ids (jsonb)
      - selected_meetings_folder_ids (jsonb)
      - selected_financial_folder_ids (jsonb)
    - n8n workflow expects data in ORIGINAL single-value columns:
      - strategy_folder_id (text)
      - strategy_folder_name (text)
      - meetings_folder_id (text)
      - meetings_folder_name (text)
      - financial_folder_id (text)
      - financial_folder_name (text)
    - This caused sync workflow confusion and failures

  2. Solution
    - Migrate data from JSONB arrays to original columns (take first array element)
    - Clear JSONB array columns to prevent future confusion
    - All code now uses original columns only

  3. Changes
    - Copy first folder ID from JSONB arrays to original columns (if not already set)
    - Clear all JSONB array columns
    - Ensure all users have data in correct columns for n8n workflow
*/

-- Migrate strategy folder data from JSONB to original column
-- Only update if original column is NULL but JSONB array has data
UPDATE user_drive_connections
SET strategy_folder_id = (selected_strategy_folder_ids->>0)
WHERE strategy_folder_id IS NULL
  AND selected_strategy_folder_ids IS NOT NULL
  AND jsonb_array_length(selected_strategy_folder_ids) > 0;

-- Migrate meetings folder data from JSONB to original column
UPDATE user_drive_connections
SET meetings_folder_id = (selected_meetings_folder_ids->>0)
WHERE meetings_folder_id IS NULL
  AND selected_meetings_folder_ids IS NOT NULL
  AND jsonb_array_length(selected_meetings_folder_ids) > 0;

-- Migrate financial folder data from JSONB to original column
UPDATE user_drive_connections
SET financial_folder_id = (selected_financial_folder_ids->>0)
WHERE financial_folder_id IS NULL
  AND selected_financial_folder_ids IS NOT NULL
  AND jsonb_array_length(selected_financial_folder_ids) > 0;

-- Clear all JSONB array columns to prevent future confusion
-- These are no longer used - all code now uses original single-value columns
UPDATE user_drive_connections
SET 
  selected_strategy_folder_ids = '[]'::jsonb,
  selected_meetings_folder_ids = '[]'::jsonb,
  selected_financial_folder_ids = '[]'::jsonb
WHERE 
  selected_strategy_folder_ids != '[]'::jsonb 
  OR selected_meetings_folder_ids != '[]'::jsonb
  OR selected_financial_folder_ids != '[]'::jsonb;

-- Add comment explaining the migration
COMMENT ON TABLE user_drive_connections IS 'Stores Google Drive OAuth tokens and folder configurations. Uses original single-value folder columns (not JSONB arrays). Migration completed to consolidate folder data.';
