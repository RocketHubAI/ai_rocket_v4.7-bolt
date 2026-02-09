/*
  # Remove Deprecated Folder Columns

  Removes unused legacy folder columns from user_drive_connections table.

  ## Columns Being Removed
  - strategy_folder_id, strategy_folder_name (deprecated)
  - meetings_folder_id, meetings_folder_name (deprecated)
  - financial_folder_id, financial_folder_name (deprecated)
  - projects_folder_id, projects_folder_name (deprecated)
  - financial_sync_enabled (no longer used)

  ## Background
  - All teams have migrated to the new unified folder structure
  - New structure uses root_folder_id for main folder
  - Additional folders use folder_1 through folder_6 columns
  - Verified 0 active connections use these deprecated columns

  ## Safety
  - All active connections checked - none use deprecated columns
  - All data has been migrated to new structure
*/

-- Drop the deprecated individual folder columns
ALTER TABLE user_drive_connections
  DROP COLUMN IF EXISTS strategy_folder_id,
  DROP COLUMN IF EXISTS strategy_folder_name,
  DROP COLUMN IF EXISTS meetings_folder_id,
  DROP COLUMN IF EXISTS meetings_folder_name,
  DROP COLUMN IF EXISTS financial_folder_id,
  DROP COLUMN IF EXISTS financial_folder_name,
  DROP COLUMN IF EXISTS financial_sync_enabled,
  DROP COLUMN IF EXISTS projects_folder_id,
  DROP COLUMN IF EXISTS projects_folder_name;
