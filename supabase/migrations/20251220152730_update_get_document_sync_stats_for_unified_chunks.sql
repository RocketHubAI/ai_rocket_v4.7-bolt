/*
  # Update get_document_sync_stats to Use Unified document_chunks Table

  1. Changes
    - Updates the function to query `document_chunks` table instead of `documents`
    - Uses `content_type` column for category classification
    - A document is "fully synced" when it has at least one chunk with content_type set
    - Categories are derived from distinct content_type values

  2. Logic
    - total_documents: COUNT(DISTINCT source_id)
    - fully_synced_documents: Documents with at least one classified chunk
    - pending_classification: Documents with no classified chunks
    - unique_categories: Distinct content_type values (strategy, meetings, financial, projects)
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
  SELECT COUNT(DISTINCT source_id)
  INTO v_total_documents
  FROM document_chunks
  WHERE team_id = p_team_id
    AND source_id IS NOT NULL;

  SELECT COUNT(*)
  INTO v_fully_synced
  FROM (
    SELECT DISTINCT source_id
    FROM document_chunks
    WHERE team_id = p_team_id
      AND source_id IS NOT NULL
      AND content_type IS NOT NULL
      AND content_type != ''
  ) classified_docs;

  v_pending_classification := GREATEST(0, v_total_documents - v_fully_synced);

  SELECT ARRAY_AGG(DISTINCT content_type)
  INTO v_categories
  FROM document_chunks
  WHERE team_id = p_team_id
    AND content_type IS NOT NULL
    AND content_type != '';

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
