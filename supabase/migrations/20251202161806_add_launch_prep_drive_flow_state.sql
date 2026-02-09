/*
  # Add Launch Prep Drive Flow State Tracking

  1. Changes
    - Add `launch_prep_drive_flow_step` column to `setup_guide_progress` table
    - Stores current step: 'connect' | 'choose-folder' | 'place-files' | 'sync-data' | null
    - Allows users to resume flow after navigating away
    - Add `launch_prep_folder_data` JSONB column to persist selected folder data

  2. Purpose
    - Persist Launch Preparation flow state across page navigations
    - User can switch tabs/windows and return to same step
    - Prevents data loss and improves UX

  3. Notes
    - NULL value means no active launch prep flow
    - Step is cleared when flow completes or modal is explicitly closed
*/

-- Add launch prep drive flow state tracking
ALTER TABLE setup_guide_progress 
ADD COLUMN IF NOT EXISTS launch_prep_drive_flow_step TEXT 
CHECK (launch_prep_drive_flow_step IN ('connect', 'choose-folder', 'place-files', 'sync-data'));

-- Add folder data persistence
ALTER TABLE setup_guide_progress 
ADD COLUMN IF NOT EXISTS launch_prep_folder_data JSONB;