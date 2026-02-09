/*
  # Update Admin Team Document Stats with Team Names and 24h Metrics

  1. Changes
    - Add team_name to get_admin_team_document_stats for direct team name lookup
    - Create get_documents_synced_last_24h function for new metrics card

  2. Benefits
    - Eliminates "Unknown Team" issue by joining teams table directly
    - Provides accurate 24-hour document sync count for admin dashboard
*/

DROP FUNCTION IF EXISTS get_admin_team_document_stats();

CREATE OR REPLACE FUNCTION get_admin_team_document_stats()
RETURNS TABLE (
  team_id uuid,
  team_name text,
  doc_count bigint,
  chunk_count bigint
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    dc.team_id,
    COALESCE(t.name, 'Unknown Team') as team_name,
    COUNT(DISTINCT COALESCE(dc.source_id, dc.google_file_id)) as doc_count,
    COUNT(*) as chunk_count
  FROM document_chunks dc
  LEFT JOIN teams t ON t.id = dc.team_id
  WHERE dc.team_id IS NOT NULL 
    AND (dc.source_id IS NOT NULL OR dc.google_file_id IS NOT NULL)
  GROUP BY dc.team_id, t.name;
$$;

CREATE OR REPLACE FUNCTION get_documents_synced_last_24h()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COUNT(DISTINCT COALESCE(source_id, google_file_id))
  FROM document_chunks
  WHERE created_at >= NOW() - INTERVAL '24 hours'
    AND (source_id IS NOT NULL OR google_file_id IS NOT NULL);
$$;
