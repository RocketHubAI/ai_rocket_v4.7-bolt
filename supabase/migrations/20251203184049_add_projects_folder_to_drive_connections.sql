/*
  # Add Projects Folder Support to Drive Connections

  1. Changes
    - Add `projects_folder_id` column to store the Google Drive folder ID for projects
    - Add `projects_folder_name` column to store the human-readable folder name
    
  2. Notes
    - Columns are nullable to allow users to configure them later
    - Follows the same pattern as existing folder columns (strategy, meetings, financial)
*/

-- Add projects folder columns to user_drive_connections
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_drive_connections' AND column_name = 'projects_folder_id'
  ) THEN
    ALTER TABLE user_drive_connections ADD COLUMN projects_folder_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_drive_connections' AND column_name = 'projects_folder_name'
  ) THEN
    ALTER TABLE user_drive_connections ADD COLUMN projects_folder_name text;
  END IF;
END $$;
