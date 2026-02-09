/*
  # Add Financial Documents Folder to Google Drive Connections

  ## Overview
  Add support for syncing Financial Documents folder from Google Drive.

  ## Changes
    1. Add financial_folder_id column to user_drive_connections
    2. Add financial_folder_name column to user_drive_connections

  ## Notes
    - Only Google Sheets files are accepted for financial documents
    - Users can configure Google Drive to auto-convert uploaded files to Google Sheets
*/

-- Add financial folder columns to user_drive_connections
ALTER TABLE user_drive_connections
ADD COLUMN IF NOT EXISTS financial_folder_id text,
ADD COLUMN IF NOT EXISTS financial_folder_name text;

-- Add helpful comments
COMMENT ON COLUMN user_drive_connections.financial_folder_id IS 'Google Drive folder ID containing financial documents (Google Sheets only)';
COMMENT ON COLUMN user_drive_connections.financial_folder_name IS 'Display name for financial documents folder';
