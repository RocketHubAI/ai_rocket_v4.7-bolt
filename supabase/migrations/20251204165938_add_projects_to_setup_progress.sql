/*
  # Add Projects Support to Setup Progress

  1. Changes
    - Add `projects_folders_selected` column to `google_drive_setup_progress` table
    - Allows users to save their Projects folder selections during guided setup

  2. Notes
    - Column added with default empty array to match other folder selection columns
    - Existing setup progress records will have empty projects array by default
*/

-- Add projects_folders_selected column
ALTER TABLE google_drive_setup_progress
ADD COLUMN IF NOT EXISTS projects_folders_selected jsonb DEFAULT '[]';
