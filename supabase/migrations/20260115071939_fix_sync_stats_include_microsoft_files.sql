/*
  # Fix get_document_sync_stats to Include Microsoft Files

  1. Problem
    - Function only counts documents with source_id OR google_file_id
    - Microsoft OneDrive/SharePoint files have microsoft_file_id instead
    - Microsoft files are not counted in total documents or sync stats

  2. Solution
    - Add microsoft_file_id to all COALESCE expressions
    - Update WHERE clauses to include microsoft_file_id IS NOT NULL
    - Add microsoft_documents count to the result

  3. Impact
    - Total document count will now include Microsoft files
    - Fuel level calculation will include Microsoft files
    - Source breakdown shows Google, Microsoft, and local uploads separately
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
  v_microsoft_docs integer;
  v_local_upload_docs integer;
  v_result jsonb;
BEGIN
  SELECT COUNT(DISTINCT COALESCE(source_id, google_file_id, microsoft_file_id))
  INTO v_total_documents
  FROM document_chunks
  WHERE team_id = p_team_id
    AND (source_id IS NOT NULL OR google_file_id IS NOT NULL OR microsoft_file_id IS NOT NULL);

  SELECT COUNT(*)
  INTO v_fully_synced
  FROM (
    SELECT DISTINCT COALESCE(source_id, google_file_id, microsoft_file_id) as doc_id
    FROM document_chunks
    WHERE team_id = p_team_id
      AND (source_id IS NOT NULL OR google_file_id IS NOT NULL OR microsoft_file_id IS NOT NULL)
      AND doc_category IS NOT NULL
  ) classified_docs;

  v_pending_classification := GREATEST(0, v_total_documents - v_fully_synced);

  SELECT ARRAY_AGG(DISTINCT doc_category::text)
  INTO v_categories
  FROM document_chunks
  WHERE team_id = p_team_id
    AND doc_category IS NOT NULL;

  SELECT COUNT(DISTINCT COALESCE(source_id, google_file_id))
  INTO v_google_drive_docs
  FROM document_chunks
  WHERE team_id = p_team_id
    AND (source_id IS NOT NULL OR google_file_id IS NOT NULL)
    AND (upload_source = 'google_drive' OR upload_source IS NULL)
    AND provider IS DISTINCT FROM 'microsoft';

  SELECT COUNT(DISTINCT COALESCE(source_id, microsoft_file_id))
  INTO v_microsoft_docs
  FROM document_chunks
  WHERE team_id = p_team_id
    AND microsoft_file_id IS NOT NULL
    AND (provider = 'microsoft' OR upload_source = 'microsoft');

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
    'microsoft_documents', COALESCE(v_microsoft_docs, 0),
    'local_upload_documents', COALESCE(v_local_upload_docs, 0)
  );

  RETURN v_result;
END;
$$;
