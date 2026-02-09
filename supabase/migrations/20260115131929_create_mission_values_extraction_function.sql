/*
  # Create Specialized Function for Mission/Values Extraction

  1. Purpose
    - Returns VTO and strategy documents specifically relevant for mission/values
    - Prioritizes by filename patterns (VTO > vision > core > strategy)
    - Aggregates chunks from the same document together
    - Returns full content without truncation for key documents

  2. Logic
    - First priority: Documents with 'vto' in filename
    - Second priority: Documents with 'vision', 'core', 'value' in filename
    - Third priority: Documents containing 'core values' or 'mission' in content
    - Aggregates all chunks per document for complete context
*/

CREATE OR REPLACE FUNCTION get_mission_values_context(p_team_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_vto_documents jsonb;
  v_vision_documents jsonb;
  v_supporting_documents jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'file_name', file_name,
      'content', full_content,
      'priority', 1,
      'source', 'vto_filename'
    )
  ), '[]'::jsonb) INTO v_vto_documents
  FROM (
    SELECT 
      file_name,
      STRING_AGG(content, E'\n\n' ORDER BY chunk_index) as full_content
    FROM document_chunks
    WHERE team_id = p_team_id
      AND (
        file_name ILIKE '%vto%'
        OR file_name ILIKE '%vision traction%'
      )
    GROUP BY file_name, google_file_id
    ORDER BY MAX(COALESCE(file_modified_at, created_at)) DESC
    LIMIT 3
  ) vto;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'file_name', file_name,
      'content', full_content,
      'priority', 2,
      'source', 'vision_filename'
    )
  ), '[]'::jsonb) INTO v_vision_documents
  FROM (
    SELECT 
      file_name,
      STRING_AGG(content, E'\n\n' ORDER BY chunk_index) as full_content
    FROM document_chunks
    WHERE team_id = p_team_id
      AND file_name NOT ILIKE '%vto%'
      AND (
        file_name ILIKE '%vision%'
        OR file_name ILIKE '%core value%'
        OR file_name ILIKE '%mission%'
        OR file_name ILIKE '%strategic%overview%'
      )
    GROUP BY file_name, google_file_id
    ORDER BY MAX(COALESCE(file_modified_at, created_at)) DESC
    LIMIT 3
  ) vision;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'file_name', file_name,
      'content', LEFT(full_content, 4000),
      'priority', 3,
      'source', 'content_match'
    )
  ), '[]'::jsonb) INTO v_supporting_documents
  FROM (
    SELECT 
      file_name,
      STRING_AGG(content, E'\n\n' ORDER BY chunk_index) as full_content
    FROM document_chunks
    WHERE team_id = p_team_id
      AND file_name NOT ILIKE '%vto%'
      AND file_name NOT ILIKE '%vision%'
      AND doc_category = 'strategy'
      AND (
        content ILIKE '%core values%'
        OR content ILIKE '%our mission%'
        OR content ILIKE '%purpose/cause/passion%'
        OR content ILIKE '%we believe%'
      )
    GROUP BY file_name, google_file_id
    ORDER BY MAX(COALESCE(file_modified_at, created_at)) DESC
    LIMIT 5
  ) supporting;

  RETURN jsonb_build_object(
    'vto_documents', v_vto_documents,
    'vision_documents', v_vision_documents,
    'supporting_documents', v_supporting_documents,
    'total_found', (
      jsonb_array_length(v_vto_documents) + 
      jsonb_array_length(v_vision_documents) + 
      jsonb_array_length(v_supporting_documents)
    )
  );
END;
$$;