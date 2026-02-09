/*
  # Move Launch Prep Flow State to Correct Table

  1. Changes
    - Add `drive_flow_step` to `launch_preparation_progress` table (where stage = 'fuel')
    - Add `drive_flow_folder_data` JSONB to `launch_preparation_progress` table
    - Remove `launch_prep_drive_flow_step` from `setup_guide_progress` (cleanup)
    - Remove `launch_prep_folder_data` from `setup_guide_progress` (cleanup)

  2. Rationale
    - `launch_preparation_progress` is the active Launch Prep system
    - `setup_guide_progress` is the old Astra Guided Setup (being deprecated)
    - Consolidating to single source of truth prevents confusion
    - Flow state is specific to Fuel stage of Launch Prep

  3. Notes
    - Flow state tracks current step: 'connect' | 'choose-folder' | 'place-files' | 'sync-data' | null
    - NULL value means no active flow
    - Folder data persists selected folder information
*/

-- Add columns to launch_preparation_progress (the correct table)
ALTER TABLE launch_preparation_progress 
ADD COLUMN IF NOT EXISTS drive_flow_step TEXT 
CHECK (drive_flow_step IN ('connect', 'choose-folder', 'place-files', 'sync-data'));

ALTER TABLE launch_preparation_progress 
ADD COLUMN IF NOT EXISTS drive_flow_folder_data JSONB;

-- Remove columns from setup_guide_progress (wrong table, cleanup)
ALTER TABLE setup_guide_progress 
DROP COLUMN IF EXISTS launch_prep_drive_flow_step;

ALTER TABLE setup_guide_progress 
DROP COLUMN IF EXISTS launch_prep_folder_data;