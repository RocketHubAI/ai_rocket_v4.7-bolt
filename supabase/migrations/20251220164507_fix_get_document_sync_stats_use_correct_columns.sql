/*
  # Fix get_document_sync_stats to Use Correct Columns

  1. Changes
    - Uses `google_file_id` instead of `source_id` to count unique documents
    - Uses `doc_category` instead of `content_type` for categories
    - A document is "fully synced" when it has at least one chunk with doc_category set
    - Categories are derived from distinct doc_category values

  2. Data Structure
    - total_documents: COUNT(DISTINCT google_file_id)
    - fully_synced_documents: Documents with at least one classified chunk
    - pending_classification: Documents with no classified chunks
    - unique_categories: Distinct doc_category values
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
  v_result jsonb;
BEGIN
  SELECT COUNT(DISTINCT google_file_id)
  INTO v_total_documents
  FROM document_chunks
  WHERE team_id = p_team_id
    AND google_file_id IS NOT NULL;

  SELECT COUNT(*)
  INTO v_fully_synced
  FROM (
    SELECT DISTINCT google_file_id
    FROM document_chunks
    WHERE team_id = p_team_id
      AND google_file_id IS NOT NULL
      AND doc_category IS NOT NULL
  ) classified_docs;

  v_pending_classification := GREATEST(0, v_total_documents - v_fully_synced);

  SELECT ARRAY_AGG(DISTINCT doc_category::text)
  INTO v_categories
  FROM document_chunks
  WHERE team_id = p_team_id
    AND doc_category IS NOT NULL;

  v_result := jsonb_build_object(
    'total_documents', COALESCE(v_total_documents, 0),
    'fully_synced_documents', COALESCE(v_fully_synced, 0),
    'pending_classification', COALESCE(v_pending_classification, 0),
    'unique_categories', COALESCE(v_categories, ARRAY[]::text[]),
    'category_count', COALESCE(array_length(v_categories, 1), 0)
  );

  RETURN v_result;
END;
$$;
