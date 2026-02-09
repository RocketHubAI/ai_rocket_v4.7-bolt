/*
  # Automatic Sync Progress Tracking via Database Triggers

  This migration creates triggers that automatically update sync session progress
  based on activity in the document_chunks table, eliminating the need for n8n
  to explicitly report progress.

  ## How It Works

  1. When chunks are INSERTED into document_chunks:
     - Find the active sync session for that team
     - Increment files_processed (counting unique document_ids)
     - Update status to 'storage' phase

  2. When chunks are UPDATED with embeddings:
     - Increment files_classified count
     - Update status to 'classification' phase

  3. Completion detection:
     - A function checks if all processed files have been classified
     - Marks session as 'completed' when done

  ## New Functions

  - update_sync_session_on_chunk_insert(): Trigger function for INSERT
  - update_sync_session_on_chunk_classify(): Trigger function for UPDATE
  - check_sync_session_completion(): Called to check if session is complete

  ## Notes

  - Works with team_id to find active sessions (no sync_batch_id coordination needed)
  - Uses DISTINCT document_id counts for accurate file tracking
  - Updates happen in real-time via existing realtime subscription
*/

-- Function to update sync session when new chunks are inserted
CREATE OR REPLACE FUNCTION update_sync_session_on_chunk_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_id uuid;
  v_unique_files_count integer;
BEGIN
  -- Find the active sync session for this team
  SELECT id INTO v_session_id
  FROM data_sync_sessions
  WHERE team_id = NEW.team_id
    AND status IN ('pending', 'discovery', 'storage', 'classification')
  ORDER BY started_at DESC
  LIMIT 1;

  -- If no active session, nothing to update
  IF v_session_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Count unique document_ids for this team in this session's timeframe
  SELECT COUNT(DISTINCT document_id) INTO v_unique_files_count
  FROM document_chunks
  WHERE team_id = NEW.team_id
    AND created_at >= (
      SELECT started_at FROM data_sync_sessions WHERE id = v_session_id
    );

  -- Update the session with new counts
  UPDATE data_sync_sessions
  SET 
    files_processed = v_unique_files_count,
    status = CASE 
      WHEN status = 'pending' OR status = 'discovery' THEN 'storage'
      ELSE status
    END,
    updated_at = now()
  WHERE id = v_session_id;

  RETURN NEW;
END;
$$;

-- Function to update sync session when chunks get classified (embedding added)
CREATE OR REPLACE FUNCTION update_sync_session_on_chunk_classify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_id uuid;
  v_classified_files_count integer;
  v_total_files_count integer;
BEGIN
  -- Only trigger when embedding changes from NULL to a value
  IF OLD.embedding IS NOT NULL OR NEW.embedding IS NULL THEN
    RETURN NEW;
  END IF;

  -- Find the active sync session for this team
  SELECT id INTO v_session_id
  FROM data_sync_sessions
  WHERE team_id = NEW.team_id
    AND status IN ('pending', 'discovery', 'storage', 'classification')
  ORDER BY started_at DESC
  LIMIT 1;

  -- If no active session, nothing to update
  IF v_session_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Count unique document_ids that have embeddings
  SELECT 
    COUNT(DISTINCT CASE WHEN embedding IS NOT NULL THEN document_id END),
    COUNT(DISTINCT document_id)
  INTO v_classified_files_count, v_total_files_count
  FROM document_chunks
  WHERE team_id = NEW.team_id
    AND created_at >= (
      SELECT started_at FROM data_sync_sessions WHERE id = v_session_id
    );

  -- Update the session with classification progress
  UPDATE data_sync_sessions
  SET 
    files_classified = v_classified_files_count,
    status = 'classification',
    updated_at = now()
  WHERE id = v_session_id;

  -- Check if sync is complete (all files classified)
  IF v_classified_files_count >= v_total_files_count AND v_total_files_count > 0 THEN
    UPDATE data_sync_sessions
    SET 
      status = 'completed',
      completed_at = now(),
      updated_at = now()
    WHERE id = v_session_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Function to manually check and complete a sync session
CREATE OR REPLACE FUNCTION check_sync_session_completion(p_team_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_id uuid;
  v_files_processed integer;
  v_files_classified integer;
  v_last_activity timestamptz;
BEGIN
  -- Find the active sync session for this team
  SELECT id INTO v_session_id
  FROM data_sync_sessions
  WHERE team_id = p_team_id
    AND status IN ('pending', 'discovery', 'storage', 'classification')
  ORDER BY started_at DESC
  LIMIT 1;

  IF v_session_id IS NULL THEN
    RETURN jsonb_build_object('status', 'no_active_session');
  END IF;

  -- Get current counts
  SELECT 
    COUNT(DISTINCT document_id),
    COUNT(DISTINCT CASE WHEN embedding IS NOT NULL THEN document_id END),
    MAX(GREATEST(created_at, COALESCE(updated_at, created_at)))
  INTO v_files_processed, v_files_classified, v_last_activity
  FROM document_chunks
  WHERE team_id = p_team_id
    AND created_at >= (
      SELECT started_at FROM data_sync_sessions WHERE id = v_session_id
    );

  -- Update session with latest counts
  UPDATE data_sync_sessions
  SET 
    files_processed = v_files_processed,
    files_classified = v_files_classified,
    updated_at = now()
  WHERE id = v_session_id;

  -- Check if complete (all classified) or stale (no activity for 2 minutes)
  IF v_files_processed > 0 AND v_files_classified >= v_files_processed THEN
    UPDATE data_sync_sessions
    SET status = 'completed', completed_at = now()
    WHERE id = v_session_id;
    
    RETURN jsonb_build_object(
      'status', 'completed',
      'files_processed', v_files_processed,
      'files_classified', v_files_classified
    );
  ELSIF v_last_activity < now() - interval '2 minutes' AND v_files_processed > 0 THEN
    -- No activity for 2 minutes, mark as complete
    UPDATE data_sync_sessions
    SET status = 'completed', completed_at = now()
    WHERE id = v_session_id;
    
    RETURN jsonb_build_object(
      'status', 'completed_timeout',
      'files_processed', v_files_processed,
      'files_classified', v_files_classified,
      'last_activity', v_last_activity
    );
  END IF;

  RETURN jsonb_build_object(
    'status', 'in_progress',
    'files_processed', v_files_processed,
    'files_classified', v_files_classified,
    'last_activity', v_last_activity
  );
END;
$$;

-- Create trigger for chunk inserts
DROP TRIGGER IF EXISTS trg_sync_progress_on_chunk_insert ON document_chunks;
CREATE TRIGGER trg_sync_progress_on_chunk_insert
  AFTER INSERT ON document_chunks
  FOR EACH ROW
  EXECUTE FUNCTION update_sync_session_on_chunk_insert();

-- Create trigger for chunk classification (embedding update)
DROP TRIGGER IF EXISTS trg_sync_progress_on_chunk_classify ON document_chunks;
CREATE TRIGGER trg_sync_progress_on_chunk_classify
  AFTER UPDATE OF embedding ON document_chunks
  FOR EACH ROW
  EXECUTE FUNCTION update_sync_session_on_chunk_classify();

-- Grant execute on the completion check function
GRANT EXECUTE ON FUNCTION check_sync_session_completion(uuid) TO authenticated;
