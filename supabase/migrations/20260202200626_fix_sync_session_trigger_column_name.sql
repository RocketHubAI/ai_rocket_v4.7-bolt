/*
  # Fix Sync Session Trigger Column Name

  1. Issue
    - The `update_sync_session_on_chunk_insert` trigger function references a column `files_processed`
    - The actual column in `data_sync_sessions` table is named `files_stored`
    - This caused the trigger to fail silently, preventing realtime progress updates

  2. Changes
    - Updates the trigger function to use the correct column name `files_stored`
    - No data migration needed - this is a function fix only

  3. Impact
    - Enables proper realtime progress tracking during document sync
    - Users will now see file counts update in real-time during sync operations
*/

CREATE OR REPLACE FUNCTION update_sync_session_on_chunk_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_session_id uuid;
  v_unique_files_count integer;
BEGIN
  SELECT id INTO v_session_id
  FROM data_sync_sessions
  WHERE team_id = NEW.team_id
  AND status IN ('pending', 'discovery', 'storage', 'classification', 'in_progress')
  ORDER BY started_at DESC
  LIMIT 1;

  IF v_session_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(DISTINCT document_id) INTO v_unique_files_count
  FROM document_chunks
  WHERE team_id = NEW.team_id
  AND created_at >= (
    SELECT started_at FROM data_sync_sessions WHERE id = v_session_id
  );

  UPDATE data_sync_sessions
  SET 
    files_stored = v_unique_files_count,
    status = CASE 
      WHEN status IN ('pending', 'discovery', 'in_progress') THEN 'storage'
      ELSE status
    END,
    updated_at = now()
  WHERE id = v_session_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;