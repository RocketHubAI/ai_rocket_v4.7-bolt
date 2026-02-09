/*
  # Backfill synced_from_folder tracking for Fireflies Meetings subfolders

  1. Problem
    - Files in //Summaries and //Transcripts folders don't have synced_from_folder_id set
    - These are subfolders of the "Fireflies Meetings" connected folder
    - The folder removal feature can't count these files properly

  2. Solution
    - Update documents in //Summaries and //Transcripts to set synced_from_folder_id
    - Set the folder ID from user_drive_connections where folder name = 'Fireflies Meetings'

  3. Changes
    - Backfill synced_from_folder_id and synced_from_folder_name for affected files
*/

UPDATE document_chunks dc
SET 
  synced_from_folder_id = udc.folder_2_id,
  synced_from_folder_name = udc.folder_2_name
FROM user_drive_connections udc
WHERE dc.team_id = udc.team_id
  AND udc.provider = 'google'
  AND udc.folder_2_name = 'Fireflies Meetings'
  AND dc.google_file_id IS NOT NULL
  AND dc.folder_path IN ('//Summaries', '//Transcripts', '//Recordings')
  AND dc.synced_from_folder_id IS NULL;
