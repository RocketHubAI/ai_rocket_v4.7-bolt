/*
  # Add connected_by tracking for folders

  1. Changes
    - Add root_folder_connected_by (uuid) - tracks who connected the root folder
    - Add folder_1_connected_by through folder_6_connected_by columns
    - These reference the users table to show who added each folder

  2. Notes
    - All columns are nullable since existing data won't have this info
    - No foreign key constraint to avoid issues with user deletion
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_drive_connections' AND column_name = 'root_folder_connected_by'
  ) THEN
    ALTER TABLE user_drive_connections ADD COLUMN root_folder_connected_by uuid;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_drive_connections' AND column_name = 'folder_1_connected_by'
  ) THEN
    ALTER TABLE user_drive_connections ADD COLUMN folder_1_connected_by uuid;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_drive_connections' AND column_name = 'folder_2_connected_by'
  ) THEN
    ALTER TABLE user_drive_connections ADD COLUMN folder_2_connected_by uuid;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_drive_connections' AND column_name = 'folder_3_connected_by'
  ) THEN
    ALTER TABLE user_drive_connections ADD COLUMN folder_3_connected_by uuid;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_drive_connections' AND column_name = 'folder_4_connected_by'
  ) THEN
    ALTER TABLE user_drive_connections ADD COLUMN folder_4_connected_by uuid;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_drive_connections' AND column_name = 'folder_5_connected_by'
  ) THEN
    ALTER TABLE user_drive_connections ADD COLUMN folder_5_connected_by uuid;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_drive_connections' AND column_name = 'folder_6_connected_by'
  ) THEN
    ALTER TABLE user_drive_connections ADD COLUMN folder_6_connected_by uuid;
  END IF;
END $$;
