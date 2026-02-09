/*
  # Add drive_flow_provider column to launch_preparation_progress

  1. Changes
    - Adds `drive_flow_provider` column to track which cloud provider (google/microsoft) is active during setup flow
    - This prevents issues when users have multiple cloud storage connections and switch between them

  2. Purpose
    - Fixes bug where Microsoft folder selection was showing Google folders due to state confusion
    - Enables proper provider context persistence across OAuth redirects
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'launch_preparation_progress' AND column_name = 'drive_flow_provider'
  ) THEN
    ALTER TABLE launch_preparation_progress ADD COLUMN drive_flow_provider text;
  END IF;
END $$;