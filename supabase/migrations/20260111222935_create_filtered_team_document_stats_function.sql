/*
  # Create Filtered Team Document Stats Function

  1. New Function
    - `get_admin_team_document_stats_filtered` - Returns team stats filtered by date range
    
  2. Parameters
    - days_back: Number of days to look back (1, 7, 30, or null for all time)
    
  3. Purpose
    - Allow filtering Storage by Team table by recent activity
*/

CREATE OR REPLACE FUNCTION get_admin_team_document_stats_filtered(days_back integer DEFAULT NULL)
RETURNS TABLE (
  team_id uuid,
  team_name text,
  doc_count bigint,
  chunk_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cutoff_date timestamptz;
BEGIN
  IF days_back IS NOT NULL THEN
    cutoff_date := NOW() - (days_back || ' days')::interval;
  END IF;

  RETURN QUERY
  SELECT 
    t.id AS team_id,
    t.name AS team_name,
    COUNT(DISTINCT dc.google_file_id)::bigint AS doc_count,
    COUNT(dc.id)::bigint AS chunk_count
  FROM teams t
  LEFT JOIN document_chunks dc ON dc.team_id = t.id
    AND (cutoff_date IS NULL OR dc.created_at >= cutoff_date)
  GROUP BY t.id, t.name
  HAVING COUNT(dc.id) > 0 OR days_back IS NULL
  ORDER BY COUNT(dc.id) DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_admin_team_document_stats_filtered(integer) TO authenticated;
