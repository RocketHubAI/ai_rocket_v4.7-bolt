/*
  # Fix Astra Team Folder Placement

  Moves "Astra Team Folder" from strategy_folder_id to root_folder_id.

  ## Changes
  - Migrates any folder named "Astra Team Folder" from strategy_folder_id to root_folder_id
  - Preserves the connected_by user ID
  - Adds comment documentation about deprecated folder columns

  ## Background
  - The app now uses root_folder_id for the main team folder
  - strategy_folder_id, meetings_folder_id, financial_folder_id, projects_folder_id are deprecated
  - Additional folders are stored in the additional_folders JSONB column
*/

-- Move "Astra Team Folder" from strategy_folder to root_folder if it's there
UPDATE user_drive_connections
SET
  root_folder_id = strategy_folder_id,
  root_folder_name = strategy_folder_name,
  root_folder_connected_by = COALESCE(root_folder_connected_by, user_id),
  strategy_folder_id = NULL,
  strategy_folder_name = NULL
WHERE
  strategy_folder_name = 'Astra Team Folder'
  AND root_folder_id IS NULL;

-- Add comments explaining the column deprecation
COMMENT ON COLUMN user_drive_connections.strategy_folder_id IS 'DEPRECATED: Use root_folder_id and additional_folders instead. Only kept for backward compatibility.';
COMMENT ON COLUMN user_drive_connections.strategy_folder_name IS 'DEPRECATED: Use root_folder_name and additional_folders instead. Only kept for backward compatibility.';
COMMENT ON COLUMN user_drive_connections.meetings_folder_id IS 'DEPRECATED: Use root_folder_id and additional_folders instead. Only kept for backward compatibility.';
COMMENT ON COLUMN user_drive_connections.meetings_folder_name IS 'DEPRECATED: Use root_folder_name and additional_folders instead. Only kept for backward compatibility.';
COMMENT ON COLUMN user_drive_connections.financial_folder_id IS 'DEPRECATED: Use root_folder_id and additional_folders instead. Only kept for backward compatibility.';
COMMENT ON COLUMN user_drive_connections.financial_folder_name IS 'DEPRECATED: Use root_folder_name and additional_folders instead. Only kept for backward compatibility.';
COMMENT ON COLUMN user_drive_connections.projects_folder_id IS 'DEPRECATED: Use root_folder_id and additional_folders instead. Only kept for backward compatibility.';
COMMENT ON COLUMN user_drive_connections.projects_folder_name IS 'DEPRECATED: Use root_folder_name and additional_folders instead. Only kept for backward compatibility.';
