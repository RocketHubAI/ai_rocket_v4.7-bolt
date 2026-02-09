/*
  # Create Document Sync Stats Function

  1. New Function
    - `get_document_sync_stats(p_team_id uuid)`
      - Returns sync statistics for a team's documents
      - Counts total documents, fully synced, pending classification
      - Lists unique categories from AI classification

  2. Purpose
    - Used by Fuel Stage to calculate progress levels
    - Provides real-time stats for sync progress UI
    - Helps determine when to advance fuel levels
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
  SELECT 
    COUNT(DISTINCT source_id),
    COUNT(DISTINCT source_id) FILTER (WHERE classified_by IS NOT NULL AND classified_by != 'pending'),
    COUNT(DISTINCT source_id) FILTER (WHERE classified_by IS NULL OR classified_by = 'pending')
  INTO v_total_documents, v_fully_synced, v_pending_classification
  FROM documents
  WHERE team_id = p_team_id;

  SELECT ARRAY_AGG(DISTINCT category)
  INTO v_categories
  FROM (
    SELECT ai_classification->>'category' as category
    FROM documents
    WHERE team_id = p_team_id
      AND ai_classification IS NOT NULL
      AND ai_classification->>'category' IS NOT NULL
      AND ai_classification->>'category' != ''
  ) sub
  WHERE category IS NOT NULL;

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