/*
  # Fix existing version numbers and is_latest_version flags
  
  1. Problem
    - Existing chunks have incorrect version numbers (one per chunk instead of per document)
    - is_latest_version is only TRUE for last chunk instead of all chunks in latest version
    
  2. Solution
    - Recalculate version numbers based on unique (source_id, document_date) combinations
    - Set is_latest_version=TRUE for ALL chunks belonging to the latest version
    - Use document_date to determine chronological order
*/

-- Recalculate versions for all documents in document_chunks_strategy
WITH document_versions AS (
  SELECT 
    source_id,
    team_id,
    document_date,
    ROW_NUMBER() OVER (
      PARTITION BY source_id, team_id 
      ORDER BY document_date ASC
    ) as correct_version,
    MAX(document_date) OVER (PARTITION BY source_id, team_id) as latest_date
  FROM (
    SELECT DISTINCT source_id, team_id, document_date
    FROM document_chunks_strategy
    WHERE source_id IS NOT NULL
  ) unique_docs
)
UPDATE document_chunks_strategy dcs
SET 
  document_version = dv.correct_version,
  is_latest_version = (dcs.document_date = dv.latest_date),
  document_identifier = COALESCE(
    dcs.document_identifier,
    lower(trim(both '-' from regexp_replace(lower(dcs.title), E'[^a-z0-9]+', '-', 'g')))
  )
FROM document_versions dv
WHERE dcs.source_id = dv.source_id
  AND dcs.team_id = dv.team_id
  AND dcs.document_date = dv.document_date;

-- Set supersedes_document_id for all non-first versions
WITH version_relationships AS (
  SELECT DISTINCT
    source_id,
    team_id,
    document_version,
    document_version - 1 as prev_version
  FROM document_chunks_strategy
  WHERE document_version > 1 AND source_id IS NOT NULL
)
UPDATE document_chunks_strategy dcs
SET supersedes_document_id = (
  SELECT MIN(id)
  FROM document_chunks_strategy prev
  WHERE prev.source_id = dcs.source_id
    AND prev.team_id = dcs.team_id
    AND prev.document_version = vr.prev_version
)
FROM version_relationships vr
WHERE dcs.source_id = vr.source_id
  AND dcs.team_id = vr.team_id
  AND dcs.document_version = vr.document_version;
