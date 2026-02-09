/*
  # Create Admin Document Stats Function

  1. Purpose
    - Provides efficient document counting for the admin dashboard
    - Counts unique documents by team and category
    - Avoids transferring 38k+ rows to edge function

  2. Function
    - `get_admin_document_stats()` returns aggregated document counts
    - Groups by team_id and doc_category
    - Returns only unique document_id counts

  3. Performance
    - Executes aggregation at database level
    - Much faster than client-side aggregation
    - Reduces data transfer significantly
*/

CREATE OR REPLACE FUNCTION get_admin_document_stats()
RETURNS TABLE (
  team_id uuid,
  doc_category text,
  doc_count bigint
) 
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    team_id,
    doc_category::text,
    COUNT(DISTINCT document_id) as doc_count
  FROM document_chunks
  WHERE team_id IS NOT NULL AND document_id IS NOT NULL
  GROUP BY team_id, doc_category;
$$;