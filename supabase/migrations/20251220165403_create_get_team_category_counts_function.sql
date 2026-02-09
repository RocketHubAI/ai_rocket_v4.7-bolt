/*
  # Create get_team_category_counts Function

  1. New Function
    - `get_team_category_counts(p_team_id uuid)`
      - Returns category counts for a team
      - Groups by doc_category and counts unique documents

  2. Returns
    - category: category name
    - count: number of documents in this category
*/

CREATE OR REPLACE FUNCTION get_team_category_counts(p_team_id uuid)
RETURNS TABLE (
  category text,
  count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dc.doc_category::text as category,
    COUNT(DISTINCT dc.google_file_id) as count
  FROM document_chunks dc
  WHERE dc.team_id = p_team_id
    AND dc.google_file_id IS NOT NULL
    AND dc.doc_category IS NOT NULL
  GROUP BY dc.doc_category
  ORDER BY count DESC;
END;
$$;
