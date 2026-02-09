/*
  # Fix document versioning triggers
  
  1. Problem
    - Two triggers are conflicting (BEFORE and AFTER)
    - BEFORE trigger runs per-chunk, creating wrong version numbers
    - is_latest_version is only TRUE for one chunk instead of all chunks in latest version
    
  2. Solution
    - Disable the problematic BEFORE trigger
    - Keep only the AFTER statement-level trigger (batch versioning)
    - Ensure batch_id is always set for proper batch detection
    
  3. How it works
    - All chunks from same document sync will have same batch_id
    - AFTER trigger processes entire batch at once
    - Sets same version number for all chunks in batch
    - Marks ALL chunks in latest version with is_latest_version=TRUE
*/

-- Disable the per-row BEFORE trigger that's causing issues
DROP TRIGGER IF EXISTS document_versions_before_insert ON document_chunks_strategy;

-- The AFTER trigger (trg_apply_batch_versioning) remains active and handles versioning correctly
-- It processes batches of chunks together, not individual rows

-- Update the batch versioning trigger to use source_id column
CREATE OR REPLACE FUNCTION apply_batch_versioning()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  rec RECORD;
  v_team_id uuid;
  v_source_id text;
  v_batch_id uuid;
  v_prev_latest_version int;
  v_new_version int;
  v_prev_latest_id bigint;
BEGIN
  -- Process each unique (team_id, source_id, batch_id) from this INSERT statement
  FOR rec IN (
    SELECT DISTINCT team_id, source_id, batch_id
    FROM new_rows
    WHERE batch_id IS NOT NULL AND source_id IS NOT NULL
  ) LOOP
    v_team_id := rec.team_id;
    v_source_id := rec.source_id;
    v_batch_id := rec.batch_id;

    -- Lock all existing rows for this document to prevent races
    PERFORM 1 FROM public.document_chunks_strategy
     WHERE team_id = v_team_id AND source_id = v_source_id
     FOR UPDATE;

    -- Find the previous latest version number
    SELECT document_version
      INTO v_prev_latest_version
    FROM public.document_chunks_strategy
    WHERE team_id = v_team_id
      AND source_id = v_source_id
      AND is_latest_version = true
    ORDER BY document_version DESC
    LIMIT 1;

    v_new_version := COALESCE(v_prev_latest_version, 0) + 1;

    -- Get a representative id from the previous version
    SELECT MIN(id) INTO v_prev_latest_id
    FROM public.document_chunks_strategy
    WHERE team_id = v_team_id
      AND source_id = v_source_id
      AND document_version = v_prev_latest_version;

    -- Downgrade ALL previous latest rows for this document
    UPDATE public.document_chunks_strategy
       SET is_latest_version = false
     WHERE team_id = v_team_id
       AND source_id = v_source_id
       AND is_latest_version = true;

    -- Apply versioning updates to ALL rows inserted in this batch
    UPDATE public.document_chunks_strategy d
       SET document_version = v_new_version,
           is_latest_version = true,
           supersedes_document_id = v_prev_latest_id,
           document_identifier = COALESCE(
             d.document_identifier,
             lower(trim(both '-' from regexp_replace(lower(d.title), E'[^a-z0-9]+', '-', 'g')))
           )
      FROM new_rows n
     WHERE d.id = n.id
       AND n.team_id = v_team_id
       AND n.source_id = v_source_id
       AND n.batch_id = v_batch_id;
       
    RAISE NOTICE 'Document % version % created with batch %', v_source_id, v_new_version, v_batch_id;
  END LOOP;

  RETURN NULL; -- statement-level trigger
END;
$function$;

-- Ensure the trigger is properly configured
DROP TRIGGER IF EXISTS trg_apply_batch_versioning ON document_chunks_strategy;

CREATE TRIGGER trg_apply_batch_versioning
  AFTER INSERT ON document_chunks_strategy
  REFERENCING NEW TABLE AS new_rows
  FOR EACH STATEMENT
  EXECUTE FUNCTION apply_batch_versioning();
