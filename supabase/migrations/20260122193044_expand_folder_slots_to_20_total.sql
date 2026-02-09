/*
  # Expand Folder Slots to Support 20 Total Folders

  ## Overview
  Expands the folder storage capacity from 7 folders (root + 6 additional) to 20 total folders.
  This gives users more flexibility to connect multiple folders from different areas of their
  cloud storage without being limited by arbitrary constraints.

  ## Changes
  1. Adds folder_7 through folder_19 columns (13 new folder slots)
     - Each folder slot includes: _id, _name, _enabled, _connected_by
  
  ## Folder Structure After Migration
  - root_folder (index 0) - First folder connected, treated equally with others
  - folder_1 through folder_19 (index 1-19) - Additional folder slots

  ## Notes
  - All new columns are nullable with appropriate defaults
  - No data migration needed - new columns start empty
  - The root folder is no longer considered "special" - it's just folder index 0
*/

DO $$
BEGIN
  -- Add folder_7 columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_drive_connections' AND column_name = 'folder_7_id') THEN
    ALTER TABLE user_drive_connections ADD COLUMN folder_7_id text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_drive_connections' AND column_name = 'folder_7_name') THEN
    ALTER TABLE user_drive_connections ADD COLUMN folder_7_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_drive_connections' AND column_name = 'folder_7_enabled') THEN
    ALTER TABLE user_drive_connections ADD COLUMN folder_7_enabled boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_drive_connections' AND column_name = 'folder_7_connected_by') THEN
    ALTER TABLE user_drive_connections ADD COLUMN folder_7_connected_by uuid;
  END IF;

  -- Add folder_8 columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_drive_connections' AND column_name = 'folder_8_id') THEN
    ALTER TABLE user_drive_connections ADD COLUMN folder_8_id text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_drive_connections' AND column_name = 'folder_8_name') THEN
    ALTER TABLE user_drive_connections ADD COLUMN folder_8_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_drive_connections' AND column_name = 'folder_8_enabled') THEN
    ALTER TABLE user_drive_connections ADD COLUMN folder_8_enabled boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_drive_connections' AND column_name = 'folder_8_connected_by') THEN
    ALTER TABLE user_drive_connections ADD COLUMN folder_8_connected_by uuid;
  END IF;

  -- Add folder_9 columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_drive_connections' AND column_name = 'folder_9_id') THEN
    ALTER TABLE user_drive_connections ADD COLUMN folder_9_id text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_drive_connections' AND column_name = 'folder_9_name') THEN
    ALTER TABLE user_drive_connections ADD COLUMN folder_9_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_drive_connections' AND column_name = 'folder_9_enabled') THEN
    ALTER TABLE user_drive_connections ADD COLUMN folder_9_enabled boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_drive_connections' AND column_name = 'folder_9_connected_by') THEN
    ALTER TABLE user_drive_connections ADD COLUMN folder_9_connected_by uuid;
  END IF;

  -- Add folder_10 columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_drive_connections' AND column_name = 'folder_10_id') THEN
    ALTER TABLE user_drive_connections ADD COLUMN folder_10_id text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_drive_connections' AND column_name = 'folder_10_name') THEN
    ALTER TABLE user_drive_connections ADD COLUMN folder_10_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_drive_connections' AND column_name = 'folder_10_enabled') THEN
    ALTER TABLE user_drive_connections ADD COLUMN folder_10_enabled boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_drive_connections' AND column_name = 'folder_10_connected_by') THEN
    ALTER TABLE user_drive_connections ADD COLUMN folder_10_connected_by uuid;
  END IF;

  -- Add folder_11 columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_drive_connections' AND column_name = 'folder_11_id') THEN
    ALTER TABLE user_drive_connections ADD COLUMN folder_11_id text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_drive_connections' AND column_name = 'folder_11_name') THEN
    ALTER TABLE user_drive_connections ADD COLUMN folder_11_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_drive_connections' AND column_name = 'folder_11_enabled') THEN
    ALTER TABLE user_drive_connections ADD COLUMN folder_11_enabled boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_drive_connections' AND column_name = 'folder_11_connected_by') THEN
    ALTER TABLE user_drive_connections ADD COLUMN folder_11_connected_by uuid;
  END IF;

  -- Add folder_12 columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_drive_connections' AND column_name = 'folder_12_id') THEN
    ALTER TABLE user_drive_connections ADD COLUMN folder_12_id text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_drive_connections' AND column_name = 'folder_12_name') THEN
    ALTER TABLE user_drive_connections ADD COLUMN folder_12_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_drive_connections' AND column_name = 'folder_12_enabled') THEN
    ALTER TABLE user_drive_connections ADD COLUMN folder_12_enabled boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_drive_connections' AND column_name = 'folder_12_connected_by') THEN
    ALTER TABLE user_drive_connections ADD COLUMN folder_12_connected_by uuid;
  END IF;

  -- Add folder_13 columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_drive_connections' AND column_name = 'folder_13_id') THEN
    ALTER TABLE user_drive_connections ADD COLUMN folder_13_id text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_drive_connections' AND column_name = 'folder_13_name') THEN
    ALTER TABLE user_drive_connections ADD COLUMN folder_13_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_drive_connections' AND column_name = 'folder_13_enabled') THEN
    ALTER TABLE user_drive_connections ADD COLUMN folder_13_enabled boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_drive_connections' AND column_name = 'folder_13_connected_by') THEN
    ALTER TABLE user_drive_connections ADD COLUMN folder_13_connected_by uuid;
  END IF;

  -- Add folder_14 columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_drive_connections' AND column_name = 'folder_14_id') THEN
    ALTER TABLE user_drive_connections ADD COLUMN folder_14_id text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_drive_connections' AND column_name = 'folder_14_name') THEN
    ALTER TABLE user_drive_connections ADD COLUMN folder_14_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_drive_connections' AND column_name = 'folder_14_enabled') THEN
    ALTER TABLE user_drive_connections ADD COLUMN folder_14_enabled boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_drive_connections' AND column_name = 'folder_14_connected_by') THEN
    ALTER TABLE user_drive_connections ADD COLUMN folder_14_connected_by uuid;
  END IF;

  -- Add folder_15 columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_drive_connections' AND column_name = 'folder_15_id') THEN
    ALTER TABLE user_drive_connections ADD COLUMN folder_15_id text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_drive_connections' AND column_name = 'folder_15_name') THEN
    ALTER TABLE user_drive_connections ADD COLUMN folder_15_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_drive_connections' AND column_name = 'folder_15_enabled') THEN
    ALTER TABLE user_drive_connections ADD COLUMN folder_15_enabled boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_drive_connections' AND column_name = 'folder_15_connected_by') THEN
    ALTER TABLE user_drive_connections ADD COLUMN folder_15_connected_by uuid;
  END IF;

  -- Add folder_16 columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_drive_connections' AND column_name = 'folder_16_id') THEN
    ALTER TABLE user_drive_connections ADD COLUMN folder_16_id text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_drive_connections' AND column_name = 'folder_16_name') THEN
    ALTER TABLE user_drive_connections ADD COLUMN folder_16_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_drive_connections' AND column_name = 'folder_16_enabled') THEN
    ALTER TABLE user_drive_connections ADD COLUMN folder_16_enabled boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_drive_connections' AND column_name = 'folder_16_connected_by') THEN
    ALTER TABLE user_drive_connections ADD COLUMN folder_16_connected_by uuid;
  END IF;

  -- Add folder_17 columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_drive_connections' AND column_name = 'folder_17_id') THEN
    ALTER TABLE user_drive_connections ADD COLUMN folder_17_id text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_drive_connections' AND column_name = 'folder_17_name') THEN
    ALTER TABLE user_drive_connections ADD COLUMN folder_17_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_drive_connections' AND column_name = 'folder_17_enabled') THEN
    ALTER TABLE user_drive_connections ADD COLUMN folder_17_enabled boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_drive_connections' AND column_name = 'folder_17_connected_by') THEN
    ALTER TABLE user_drive_connections ADD COLUMN folder_17_connected_by uuid;
  END IF;

  -- Add folder_18 columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_drive_connections' AND column_name = 'folder_18_id') THEN
    ALTER TABLE user_drive_connections ADD COLUMN folder_18_id text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_drive_connections' AND column_name = 'folder_18_name') THEN
    ALTER TABLE user_drive_connections ADD COLUMN folder_18_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_drive_connections' AND column_name = 'folder_18_enabled') THEN
    ALTER TABLE user_drive_connections ADD COLUMN folder_18_enabled boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_drive_connections' AND column_name = 'folder_18_connected_by') THEN
    ALTER TABLE user_drive_connections ADD COLUMN folder_18_connected_by uuid;
  END IF;

  -- Add folder_19 columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_drive_connections' AND column_name = 'folder_19_id') THEN
    ALTER TABLE user_drive_connections ADD COLUMN folder_19_id text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_drive_connections' AND column_name = 'folder_19_name') THEN
    ALTER TABLE user_drive_connections ADD COLUMN folder_19_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_drive_connections' AND column_name = 'folder_19_enabled') THEN
    ALTER TABLE user_drive_connections ADD COLUMN folder_19_enabled boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_drive_connections' AND column_name = 'folder_19_connected_by') THEN
    ALTER TABLE user_drive_connections ADD COLUMN folder_19_connected_by uuid;
  END IF;
END $$;