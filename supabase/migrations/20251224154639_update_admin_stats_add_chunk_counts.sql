/*
  # Update Admin Document Stats to Include Chunk Counts

  1. Purpose
    - Provides both document count and chunk count per team
    - Replaces category breakdown with simple totals
    - Used for Admin Dashboard table showing team document/chunk metrics

  2. Function Updates
    - `get_admin_team_document_stats()` returns per-team aggregations
    - Counts unique documents (document_id)
    - Counts total chunks/records
    - Groups only by team_id

  3. Performance
    - Single table scan for both metrics
    - Minimal data transfer
    - Optimized for dashboard display
*/

-- Create new function for team-level document and chunk stats
CREATE OR REPLACE FUNCTION get_admin_team_document_stats()
RETURNS TABLE (
  team_id uuid,
  doc_count bigint,
  chunk_count bigint
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    team_id,
    COUNT(DISTINCT document_id) as doc_count,
    COUNT(*) as chunk_count
  FROM document_chunks
  WHERE team_id IS NOT NULL AND document_id IS NOT NULL
  GROUP BY team_id;
$$;
