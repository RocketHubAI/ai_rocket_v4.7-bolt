/*
  # Add Local Uploads Folder to Drive Connections

  1. New Columns
    - `local_uploads_folder_id` (text) - Google Drive folder ID for local uploads
    - `local_uploads_folder_name` (text) - Display name of the folder
  
  2. Purpose
    - Store reference to a Google Drive folder where locally uploaded files 
      will be placed so n8n workflows can process them like other Drive files
    - This enables the unified sync pipeline to handle local uploads
*/

ALTER TABLE user_drive_connections 
ADD COLUMN IF NOT EXISTS local_uploads_folder_id text;

ALTER TABLE user_drive_connections 
ADD COLUMN IF NOT EXISTS local_uploads_folder_name text;

COMMENT ON COLUMN user_drive_connections.local_uploads_folder_id IS 'Google Drive folder ID for storing locally uploaded files';
COMMENT ON COLUMN user_drive_connections.local_uploads_folder_name IS 'Display name of the local uploads folder';