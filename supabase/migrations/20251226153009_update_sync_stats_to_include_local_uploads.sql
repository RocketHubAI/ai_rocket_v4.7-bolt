/*
  # Update Document Sync Stats to Include Local Uploads

  1. Changes
    - Modified `get_document_sync_stats` to count both Google Drive and local upload documents
    - Uses `source_id` (which can be google_file_id OR storage_path) to count unique documents
    - A document is identified by source_id instead of just google_file_id
    - Supports both upload_source types: 'google_drive' and 'local_upload'

  2. Data Structure
    - total_documents: COUNT(DISTINCT source_id) from all sources
    - fully_synced_documents: Documents with at least one classified chunk (any source)
    - pending_classification: Documents with no classified chunks (any source)
    - unique_categories: Distinct doc_category values (from all sources)
    - google_drive_documents: COUNT of documents from Google Drive
    - local_upload_documents: COUNT of documents from local uploads

  3. Notes
    - source_id is used as the universal document identifier
    - For Google Drive: source_id = google_file_id
    - For local uploads: source_id = storage_path
    - Both sources contribute to fuel level calculations
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
  SELECT COUNT(DISTINCT source_id)
  INTO v_total_documents
  FROM document_chunks
  WHERE team_id = p_team_id
    AND source_id IS NOT NULL;

  -- Count fully synced documents (with classification) from all sources
  SELECT COUNT(*)
  INTO v_fully_synced
  FROM (
    SELECT DISTINCT source_id
    FROM document_chunks
    WHERE team_id = p_team_id
      AND source_id IS NOT NULL
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
  SELECT COUNT(DISTINCT source_id)
  INTO v_google_drive_docs
  FROM document_chunks
  WHERE team_id = p_team_id
    AND source_id IS NOT NULL
    AND upload_source = 'google_drive';

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
