/*
  # Fix Performance Metrics Function Column Ambiguity

  1. Changes
    - Renamed internal variables to avoid conflicts with pg_stat_user_tables columns
    - Use table alias to disambiguate column references
*/

CREATE OR REPLACE FUNCTION get_document_chunks_performance_metrics()
RETURNS TABLE (
  total_rows bigint,
  total_size_mb numeric,
  index_size_mb numeric,
  table_size_mb numeric,
  avg_row_size_bytes numeric,
  index_hit_rate numeric,
  seq_scan_count bigint,
  idx_scan_count bigint,
  seq_scan_ratio numeric,
  dead_tuple_count bigint,
  dead_tuple_ratio numeric,
  last_vacuum timestamptz,
  last_analyze timestamptz,
  largest_team_id uuid,
  largest_team_rows bigint,
  largest_team_percentage numeric,
  team_count integer,
  partitioning_recommended boolean,
  partitioning_reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_rows bigint;
  v_total_size_mb numeric;
  v_index_size_mb numeric;
  v_table_size_mb numeric;
  v_avg_row_size numeric;
  v_heap_blks_hit bigint;
  v_heap_blks_read bigint;
  v_idx_blks_hit bigint;
  v_idx_blks_read bigint;
  v_index_hit_rate numeric;
  v_seq_scan bigint;
  v_idx_scan bigint;
  v_seq_ratio numeric;
  v_dead_tuples bigint;
  v_dead_ratio numeric;
  v_last_vacuum_ts timestamptz;
  v_last_analyze_ts timestamptz;
  v_largest_team uuid;
  v_largest_team_count bigint;
  v_largest_team_pct numeric;
  v_team_count integer;
  v_partition_recommended boolean := false;
  v_partition_reason text := 'Performance is optimal';
  v_reasons text[] := ARRAY[]::text[];
BEGIN
  SELECT 
    pst.n_live_tup,
    pst.n_dead_tup,
    pst.last_vacuum,
    pst.last_analyze,
    pst.seq_scan,
    pst.idx_scan
  INTO 
    v_total_rows,
    v_dead_tuples,
    v_last_vacuum_ts,
    v_last_analyze_ts,
    v_seq_scan,
    v_idx_scan
  FROM pg_stat_user_tables pst
  WHERE pst.relname = 'document_chunks';

  SELECT 
    pg_total_relation_size('document_chunks') / (1024.0 * 1024.0),
    pg_indexes_size('document_chunks') / (1024.0 * 1024.0),
    pg_relation_size('document_chunks') / (1024.0 * 1024.0)
  INTO v_total_size_mb, v_index_size_mb, v_table_size_mb;

  IF v_total_rows > 0 THEN
    v_avg_row_size := (v_table_size_mb * 1024.0 * 1024.0) / v_total_rows;
  ELSE
    v_avg_row_size := 0;
  END IF;

  SELECT 
    COALESCE(pstio.heap_blks_hit, 0),
    COALESCE(pstio.heap_blks_read, 0),
    COALESCE(pstio.idx_blks_hit, 0),
    COALESCE(pstio.idx_blks_read, 0)
  INTO v_heap_blks_hit, v_heap_blks_read, v_idx_blks_hit, v_idx_blks_read
  FROM pg_statio_user_tables pstio
  WHERE pstio.relname = 'document_chunks';

  IF (v_idx_blks_hit + v_idx_blks_read) > 0 THEN
    v_index_hit_rate := ROUND((v_idx_blks_hit::numeric / (v_idx_blks_hit + v_idx_blks_read)::numeric) * 100, 2);
  ELSE
    v_index_hit_rate := 100;
  END IF;

  IF (v_seq_scan + v_idx_scan) > 0 THEN
    v_seq_ratio := ROUND((v_seq_scan::numeric / (v_seq_scan + v_idx_scan)::numeric) * 100, 2);
  ELSE
    v_seq_ratio := 0;
  END IF;

  IF v_total_rows > 0 THEN
    v_dead_ratio := ROUND((v_dead_tuples::numeric / v_total_rows::numeric) * 100, 2);
  ELSE
    v_dead_ratio := 0;
  END IF;

  SELECT 
    dc.team_id,
    COUNT(*),
    ROUND((COUNT(*)::numeric / v_total_rows::numeric) * 100, 1)
  INTO v_largest_team, v_largest_team_count, v_largest_team_pct
  FROM document_chunks dc
  GROUP BY dc.team_id
  ORDER BY COUNT(*) DESC
  LIMIT 1;

  SELECT COUNT(DISTINCT dc2.team_id) INTO v_team_count FROM document_chunks dc2;

  IF v_total_rows > 500000 THEN
    v_partition_recommended := true;
    v_reasons := array_append(v_reasons, 'Row count exceeds 500K (' || v_total_rows::text || ')');
  END IF;

  IF v_largest_team_pct > 70 THEN
    v_partition_recommended := true;
    v_reasons := array_append(v_reasons, 'Single team contains ' || v_largest_team_pct::text || '% of data');
  END IF;

  IF v_seq_ratio > 20 AND v_total_rows > 100000 THEN
    v_partition_recommended := true;
    v_reasons := array_append(v_reasons, 'Sequential scan ratio is ' || v_seq_ratio::text || '%');
  END IF;

  IF v_index_hit_rate < 95 AND v_total_rows > 50000 THEN
    v_partition_recommended := true;
    v_reasons := array_append(v_reasons, 'Index hit rate is only ' || v_index_hit_rate::text || '%');
  END IF;

  IF v_total_size_mb > 5000 THEN
    v_partition_recommended := true;
    v_reasons := array_append(v_reasons, 'Table size exceeds 5GB (' || ROUND(v_total_size_mb/1024, 1)::text || 'GB)');
  END IF;

  IF array_length(v_reasons, 1) > 0 THEN
    v_partition_reason := array_to_string(v_reasons, '; ');
  END IF;

  RETURN QUERY SELECT
    v_total_rows,
    ROUND(v_total_size_mb, 2),
    ROUND(v_index_size_mb, 2),
    ROUND(v_table_size_mb, 2),
    ROUND(v_avg_row_size, 0),
    v_index_hit_rate,
    v_seq_scan,
    v_idx_scan,
    v_seq_ratio,
    v_dead_tuples,
    v_dead_ratio,
    v_last_vacuum_ts,
    v_last_analyze_ts,
    v_largest_team,
    v_largest_team_count,
    v_largest_team_pct,
    v_team_count,
    v_partition_recommended,
    v_partition_reason;
END;
$$;
