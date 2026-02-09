/*
  # Fix unique documents count

  1. Changes
    - Use google_file_id instead of source_id for unique document count
    - google_file_id correctly identifies unique documents (2,986 vs 36)
*/

DROP FUNCTION IF EXISTS public.get_document_chunks_health();

CREATE FUNCTION public.get_document_chunks_health()
RETURNS TABLE(
  total_rows bigint, 
  active_rows bigint, 
  unique_documents bigint,
  total_size text, 
  index_size text, 
  rows_per_team jsonb, 
  oldest_modified timestamp with time zone, 
  newest_modified timestamp with time zone
)
LANGUAGE sql
SECURITY DEFINER
AS $function$
    SELECT 
        (SELECT count(*) FROM document_chunks) as total_rows,
        (SELECT count(*) FROM document_chunks WHERE sync_status = 'active') as active_rows,
        (SELECT count(DISTINCT google_file_id) FROM document_chunks WHERE google_file_id IS NOT NULL) as unique_documents,
        pg_size_pretty(pg_total_relation_size('document_chunks')) as total_size,
        pg_size_pretty(pg_indexes_size('document_chunks')) as index_size,
        (SELECT jsonb_object_agg(team_id, cnt) 
         FROM (SELECT team_id, count(*) as cnt FROM document_chunks GROUP BY team_id) t) as rows_per_team,
        (SELECT min(file_modified_at) FROM document_chunks) as oldest_modified,
        (SELECT max(file_modified_at) FROM document_chunks) as newest_modified;
$function$;
