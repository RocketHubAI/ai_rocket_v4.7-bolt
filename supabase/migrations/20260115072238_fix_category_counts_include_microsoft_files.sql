/*
  # Fix get_team_category_counts to Include Microsoft Files

  1. Problem
    - Function only counts documents by google_file_id
    - Microsoft OneDrive/SharePoint files have microsoft_file_id instead
    - Category counts on Mission Control exclude Microsoft files

  2. Solution
    - Use COALESCE to include google_file_id, microsoft_file_id, and source_id
    - Update WHERE clause to include all file ID types

  3. Impact
    - Category counts will now include Microsoft files
    - Total document count derived from categories will be accurate
    - Mission Control will show correct counts matching Fuel Stage
*/

CREATE OR REPLACE FUNCTION get_team_category_counts(p_team_id uuid)
RETURNS TABLE(category text, count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dc.doc_category::text as category,
    COUNT(DISTINCT COALESCE(dc.source_id, dc.google_file_id, dc.microsoft_file_id)) as count
  FROM document_chunks dc
  WHERE dc.team_id = p_team_id
    AND (dc.source_id IS NOT NULL OR dc.google_file_id IS NOT NULL OR dc.microsoft_file_id IS NOT NULL)
    AND dc.doc_category IS NOT NULL
  GROUP BY dc.doc_category
  ORDER BY count DESC;
END;
$$;
