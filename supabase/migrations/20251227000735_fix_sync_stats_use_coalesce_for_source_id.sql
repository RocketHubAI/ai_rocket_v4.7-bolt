/*
  # Fix Document Sync Stats to Handle NULL source_id

  1. Problem
    - source_id was added for local uploads but not backfilled for existing documents
    - Existing Google Drive documents have NULL source_id
    - Stats function counts 0 documents because it only looks at source_id

  2. Solution
    - Use COALESCE(source_id, google_file_id) as fallback
    - This allows the function to work with both old and new data
    - Eventually source_id will be backfilled in background

  3. Impact
    - Immediately fixes document counts
    - Works for both Google Drive and local uploads
    - Backward compatible with existing data
*/

CREATE OR REPLACE FUNCTION get_document_sync_stats(p_team_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_documents integer;
  v_fully_synced integer;
  v_pending_classification integer;
  v_categories text[];
  v_google_drive_docs integer;
  v_local_upload_docs integer;
  v_result jsonb;
BEGIN
  -- Count total unique documents from all sources
  -- Use COALESCE to handle legacy data where source_id is NULL
  SELECT COUNT(DISTINCT COALESCE(source_id, google_file_id))
  INTO v_total_documents
  FROM document_chunks
  WHERE team_id = p_team_id
    AND (source_id IS NOT NULL OR google_file_id IS NOT NULL);

  -- Count fully synced documents (with classification) from all sources
  SELECT COUNT(*)
  INTO v_fully_synced
  FROM (
    SELECT DISTINCT COALESCE(source_id, google_file_id) as doc_id
    FROM document_chunks
    WHERE team_id = p_team_id
      AND (source_id IS NOT NULL OR google_file_id IS NOT NULL)
      AND doc_category IS NOT NULL
  ) classified_docs;

  v_pending_classification := GREATEST(0, v_total_documents - v_fully_synced);

  -- Get unique categories from all sources
  SELECT ARRAY_AGG(DISTINCT doc_category::text)
  INTO v_categories
  FROM document_chunks
  WHERE team_id = p_team_id
    AND doc_category IS NOT NULL;

  -- Count Google Drive documents
  SELECT COUNT(DISTINCT COALESCE(source_id, google_file_id))
  INTO v_google_drive_docs
  FROM document_chunks
  WHERE team_id = p_team_id
    AND (source_id IS NOT NULL OR google_file_id IS NOT NULL)
    AND (upload_source = 'google_drive' OR upload_source IS NULL);

  -- Count local upload documents
  SELECT COUNT(DISTINCT source_id)
  INTO v_local_upload_docs
  FROM document_chunks
  WHERE team_id = p_team_id
    AND source_id IS NOT NULL
    AND upload_source = 'local_upload';

  v_result := jsonb_build_object(
    'total_documents', COALESCE(v_total_documents, 0),
    'fully_synced_documents', COALESCE(v_fully_synced, 0),
    'pending_classification', COALESCE(v_pending_classification, 0),
    'unique_categories', COALESCE(v_categories, ARRAY[]::text[]),
    'category_count', COALESCE(array_length(v_categories, 1), 0),
    'google_drive_documents', COALESCE(v_google_drive_docs, 0),
    'local_upload_documents', COALESCE(v_local_upload_docs, 0)
  );

  RETURN v_result;
END;
$$;
