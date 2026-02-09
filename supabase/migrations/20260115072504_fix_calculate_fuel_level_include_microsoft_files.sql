/*
  # Fix calculate_fuel_level to Include Microsoft Files

  1. Problem
    - Function counts documents using COALESCE(source_id, google_file_id)
    - Microsoft OneDrive/SharePoint files have microsoft_file_id
    - Fuel level document count excludes Microsoft files

  2. Solution
    - Update COALESCE to include microsoft_file_id
    - Update WHERE clauses to check for microsoft_file_id

  3. Impact
    - Mission Control page will show correct document count
    - Fuel level calculations will include all file types
*/

CREATE OR REPLACE FUNCTION calculate_fuel_level(p_team_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_documents integer;
  v_fully_synced_documents integer;
  v_pending_classification integer;
  v_categories text[];
  v_category_count integer;
  v_drive_connected boolean;
  v_current_level integer := 0;
  v_next_level_docs integer;
  v_next_level_cats integer;
  v_progress_percentage integer := 0;
  v_result jsonb;
BEGIN
  -- Count total unique documents from all sources (including Microsoft)
  SELECT COUNT(DISTINCT COALESCE(source_id, google_file_id, microsoft_file_id))
  INTO v_total_documents
  FROM document_chunks
  WHERE team_id = p_team_id
    AND (source_id IS NOT NULL OR google_file_id IS NOT NULL OR microsoft_file_id IS NOT NULL);

  -- Count fully synced documents (with classification)
  SELECT COUNT(*)
  INTO v_fully_synced_documents
  FROM (
    SELECT DISTINCT COALESCE(source_id, google_file_id, microsoft_file_id) as doc_id
    FROM document_chunks
    WHERE team_id = p_team_id
      AND (source_id IS NOT NULL OR google_file_id IS NOT NULL OR microsoft_file_id IS NOT NULL)
      AND doc_category IS NOT NULL
  ) classified_docs;

  v_pending_classification := GREATEST(0, v_total_documents - v_fully_synced_documents);

  -- Get unique categories
  SELECT ARRAY_AGG(DISTINCT doc_category::text)
  INTO v_categories
  FROM document_chunks
  WHERE team_id = p_team_id
    AND doc_category IS NOT NULL;

  v_category_count := COALESCE(array_length(v_categories, 1), 0);

  -- Check if any drive is connected (Google or Microsoft)
  SELECT EXISTS (
    SELECT 1
    FROM user_drive_connections
    WHERE team_id = p_team_id
      AND is_active = true
  ) INTO v_drive_connected;

  -- Level calculation based on requirements
  -- Level 1: 1+ document
  IF v_fully_synced_documents >= 1 THEN
    v_current_level := 1;
  END IF;

  -- Level 2: 5+ documents and 2+ categories
  IF v_fully_synced_documents >= 5 AND v_category_count >= 2 THEN
    v_current_level := 2;
  END IF;

  -- Level 3: 50+ documents and 5+ categories
  IF v_fully_synced_documents >= 50 AND v_category_count >= 5 THEN
    v_current_level := 3;
  END IF;

  -- Level 4: 200+ documents and 8+ categories
  IF v_fully_synced_documents >= 200 AND v_category_count >= 8 THEN
    v_current_level := 4;
  END IF;

  -- Level 5: 1000+ documents and 12+ categories
  IF v_fully_synced_documents >= 1000 AND v_category_count >= 12 THEN
    v_current_level := 5;
  END IF;

  -- Calculate next level requirements
  CASE v_current_level
    WHEN 0 THEN
      v_next_level_docs := 1;
      v_next_level_cats := 0;
    WHEN 1 THEN
      v_next_level_docs := 5;
      v_next_level_cats := 2;
    WHEN 2 THEN
      v_next_level_docs := 50;
      v_next_level_cats := 5;
    WHEN 3 THEN
      v_next_level_docs := 200;
      v_next_level_cats := 8;
    WHEN 4 THEN
      v_next_level_docs := 1000;
      v_next_level_cats := 12;
    ELSE
      v_next_level_docs := NULL;
      v_next_level_cats := NULL;
  END CASE;

  -- Calculate progress percentage to next level
  IF v_next_level_docs IS NOT NULL THEN
    DECLARE
      v_doc_progress numeric;
      v_cat_progress numeric;
      v_prev_docs integer;
      v_prev_cats integer;
    BEGIN
      -- Get previous level requirements
      CASE v_current_level
        WHEN 0 THEN v_prev_docs := 0; v_prev_cats := 0;
        WHEN 1 THEN v_prev_docs := 1; v_prev_cats := 0;
        WHEN 2 THEN v_prev_docs := 5; v_prev_cats := 2;
        WHEN 3 THEN v_prev_docs := 50; v_prev_cats := 5;
        WHEN 4 THEN v_prev_docs := 200; v_prev_cats := 8;
        ELSE v_prev_docs := 0; v_prev_cats := 0;
      END CASE;

      -- Calculate progress for documents
      IF v_next_level_docs > v_prev_docs THEN
        v_doc_progress := LEAST(100, ((v_fully_synced_documents - v_prev_docs)::numeric / (v_next_level_docs - v_prev_docs)::numeric) * 100);
      ELSE
        v_doc_progress := 100;
      END IF;

      -- Calculate progress for categories
      IF v_next_level_cats > v_prev_cats THEN
        v_cat_progress := LEAST(100, ((v_category_count - v_prev_cats)::numeric / (v_next_level_cats - v_prev_cats)::numeric) * 100);
      ELSE
        v_cat_progress := 100;
      END IF;

      -- Overall progress is the minimum of both
      v_progress_percentage := LEAST(v_doc_progress, v_cat_progress)::integer;
      v_progress_percentage := GREATEST(0, v_progress_percentage);
    END;
  ELSE
    v_progress_percentage := 100;
  END IF;

  v_result := jsonb_build_object(
    'current_level', v_current_level,
    'total_documents', COALESCE(v_total_documents, 0),
    'fully_synced_documents', COALESCE(v_fully_synced_documents, 0),
    'pending_classification', COALESCE(v_pending_classification, 0),
    'categories', COALESCE(v_categories, ARRAY[]::text[]),
    'category_count', COALESCE(v_category_count, 0),
    'drive_connected', COALESCE(v_drive_connected, false),
    'progress_percentage', v_progress_percentage,
    'next_level_requirements', jsonb_build_object(
      'documents', v_next_level_docs,
      'categories', v_next_level_cats
    )
  );

  RETURN v_result;
END;
$$;
