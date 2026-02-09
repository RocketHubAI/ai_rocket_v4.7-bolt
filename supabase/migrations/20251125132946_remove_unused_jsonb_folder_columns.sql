/*
  # Remove Unused JSONB Folder Columns

  1. Background
    - These columns were created for multi-folder selection support
    - All code has been updated to use the original single-value text columns
    - Data has been migrated back to original columns
    - These JSONB columns are now empty and unused
    
  2. Columns Being Removed
    - selected_strategy_folder_ids (jsonb)
    - selected_meetings_folder_ids (jsonb)
    - selected_financial_folder_ids (jsonb)
    
  3. Impact
    - No data loss (all data already in original columns)
    - Simplifies schema
    - Prevents future confusion
    - n8n workflow continues to work with original columns
*/

-- Drop the unused JSONB folder columns
ALTER TABLE user_drive_connections 
DROP COLUMN IF EXISTS selected_strategy_folder_ids;

ALTER TABLE user_drive_connections 
DROP COLUMN IF EXISTS selected_meetings_folder_ids;

ALTER TABLE user_drive_connections 
DROP COLUMN IF EXISTS selected_financial_folder_ids;

-- Update table comment to reflect clean schema
COMMENT ON TABLE user_drive_connections IS 
'Stores Google Drive OAuth tokens and folder configurations. 
Uses single-value text columns for folder IDs and names:
- strategy_folder_id, strategy_folder_name
- meetings_folder_id, meetings_folder_name  
- financial_folder_id, financial_folder_name';
