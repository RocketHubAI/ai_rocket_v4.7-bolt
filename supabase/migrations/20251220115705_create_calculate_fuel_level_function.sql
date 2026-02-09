/*
  # Create Calculate Fuel Level Function

  1. New Function
    - `calculate_fuel_level(p_team_id uuid)`
      - Calculates current fuel level based on documents and categories
      - Returns level, counts, and progress to next level

  2. Fuel Level Thresholds
    - Level 1: Drive connected (handled in UI, just requires connection)
    - Level 2: 1+ fully synced document
    - Level 3: 50+ documents AND 2+ categories
    - Level 4: 200+ documents AND 4+ categories
    - Level 5: 1000+ documents AND 8+ categories

  3. Returns
    - current_level: 1-5
    - total_documents: count of all documents
    - fully_synced_documents: count with classification complete
    - category_count: number of unique categories
    - next_level_requirements: what's needed to advance
    - progress_percentage: 0-100 progress toward next level
*/

CREATE OR REPLACE FUNCTION calculate_fuel_level(p_team_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stats jsonb;
  v_total_docs integer;
  v_synced_docs integer;
  v_category_count integer;
  v_current_level integer;
  v_next_level_docs integer;
  v_next_level_cats integer;
  v_doc_progress float;
  v_cat_progress float;
  v_progress_percentage integer;
  v_drive_connected boolean;
BEGIN
  v_stats := get_document_sync_stats(p_team_id);
  
  v_total_docs := (v_stats->>'total_documents')::integer;
  v_synced_docs := (v_stats->>'fully_synced_documents')::integer;
  v_category_count := (v_stats->>'category_count')::integer;

  SELECT EXISTS (
    SELECT 1 FROM user_drive_connections 
    WHERE team_id = p_team_id 
    AND access_token IS NOT NULL
  ) INTO v_drive_connected;

  IF v_synced_docs >= 1000 AND v_category_count >= 8 THEN
    v_current_level := 5;
    v_next_level_docs := NULL;
    v_next_level_cats := NULL;
    v_progress_percentage := 100;
  ELSIF v_synced_docs >= 200 AND v_category_count >= 4 THEN
    v_current_level := 4;
    v_next_level_docs := 1000;
    v_next_level_cats := 8;
    v_doc_progress := LEAST((v_synced_docs::float / 1000) * 100, 100);
    v_cat_progress := LEAST((v_category_count::float / 8) * 100, 100);
    v_progress_percentage := LEAST(((v_doc_progress + v_cat_progress) / 2)::integer, 100);
  ELSIF v_synced_docs >= 50 AND v_category_count >= 2 THEN
    v_current_level := 3;
    v_next_level_docs := 200;
    v_next_level_cats := 4;
    v_doc_progress := LEAST(((v_synced_docs - 50)::float / 150) * 100, 100);
    v_cat_progress := LEAST(((v_category_count - 2)::float / 2) * 100, 100);
    v_progress_percentage := LEAST(((v_doc_progress + v_cat_progress) / 2)::integer, 100);
  ELSIF v_synced_docs >= 1 THEN
    v_current_level := 2;
    v_next_level_docs := 50;
    v_next_level_cats := 2;
    v_doc_progress := LEAST((v_synced_docs::float / 50) * 100, 100);
    v_cat_progress := LEAST((v_category_count::float / 2) * 100, 100);
    v_progress_percentage := LEAST(((v_doc_progress + v_cat_progress) / 2)::integer, 100);
  ELSIF v_drive_connected THEN
    v_current_level := 1;
    v_next_level_docs := 1;
    v_next_level_cats := NULL;
    v_progress_percentage := CASE WHEN v_total_docs > 0 THEN 50 ELSE 0 END;
  ELSE
    v_current_level := 0;
    v_next_level_docs := NULL;
    v_next_level_cats := NULL;
    v_progress_percentage := 0;
  END IF;

  RETURN jsonb_build_object(
    'current_level', v_current_level,
    'total_documents', v_total_docs,
    'fully_synced_documents', v_synced_docs,
    'pending_classification', (v_stats->>'pending_classification')::integer,
    'category_count', v_category_count,
    'categories', v_stats->'unique_categories',
    'drive_connected', v_drive_connected,
    'next_level_requirements', CASE 
      WHEN v_current_level >= 5 THEN NULL
      ELSE jsonb_build_object(
        'documents', v_next_level_docs,
        'categories', v_next_level_cats
      )
    END,
    'progress_percentage', v_progress_percentage
  );
END;
$$;