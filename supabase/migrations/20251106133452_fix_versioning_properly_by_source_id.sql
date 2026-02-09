/*
  # Fix versioning to work by source_id, not individual chunk timestamps
  
  1. Problem
    - Each chunk has slightly different document_date (milliseconds apart)
    - Previous fix treated each chunk timestamp as a separate version
    - Need to group all chunks with same source_id as one version
    
  2. Solution
    - Version numbers should be per unique source_id
    - All chunks with same source_id get same version number
    - is_latest_version based on which source_id is most recent
    - Use batch_id or earliest chunk timestamp to determine version order
*/

-- First, reset all version info
UPDATE document_chunks_strategy
SET document_version = NULL, is_latest_version = NULL, supersedes_document_id = NULL
WHERE source_id IS NOT NULL;

-- Now recalculate correctly: one version per source_id
WITH source_versions AS (
  SELECT 
    source_id,
    team_id,
    title,
    MIN(document_date) as first_chunk_time,
    ROW_NUMBER() OVER (
      PARTITION BY 
        -- Group documents with same title and team
        lower(trim(both '-' from regexp_replace(lower(title), E'[^a-z0-9]+', '-', 'g'))),
        team_id 
      ORDER BY MIN(document_date) ASC
    ) as version_number
  FROM document_chunks_strategy
  WHERE source_id IS NOT NULL
  GROUP BY source_id, team_id, title
),
latest_versions AS (
  SELECT 
    lower(trim(both '-' from regexp_replace(lower(title), E'[^a-z0-9]+', '-', 'g'))) as doc_identifier,
    team_id,
    MAX(version_number) as max_version
  FROM source_versions
  GROUP BY lower(trim(both '-' from regexp_replace(lower(title), E'[^a-z0-9]+', '-', 'g'))), team_id
)
UPDATE document_chunks_strategy dcs
SET 
  document_version = sv.version_number,
  is_latest_version = (sv.version_number = lv.max_version),
  document_identifier = lower(trim(both '-' from regexp_replace(lower(sv.title), E'[^a-z0-9]+', '-', 'g')))
FROM source_versions sv
JOIN latest_versions lv ON 
  lower(trim(both '-' from regexp_replace(lower(sv.title), E'[^a-z0-9]+', '-', 'g'))) = lv.doc_identifier
  AND sv.team_id = lv.team_id
WHERE dcs.source_id = sv.source_id
  AND dcs.team_id = sv.team_id;

-- Set supersedes_document_id for versions > 1
WITH prev_versions AS (
  SELECT DISTINCT
    dcs.source_id,
    dcs.team_id,
    dcs.document_identifier,
    dcs.document_version,
    (
      SELECT MIN(id)
      FROM document_chunks_strategy prev
      WHERE prev.document_identifier = dcs.document_identifier
        AND prev.team_id = dcs.team_id
        AND prev.document_version = dcs.document_version - 1
    ) as prev_doc_id
  FROM document_chunks_strategy dcs
  WHERE dcs.document_version > 1 AND dcs.source_id IS NOT NULL
)
UPDATE document_chunks_strategy dcs
SET supersedes_document_id = pv.prev_doc_id
FROM prev_versions pv
WHERE dcs.source_id = pv.source_id
  AND dcs.team_id = pv.team_id;
