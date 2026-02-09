/*
  # Add Generation Status Tracking to Astra Visualizations

  1. Changes
    - Add `status` column to track generation progress (pending, generating, complete, error)
    - Add `error_message` column to store any error details
    - Add index on status for efficient queries

  2. Purpose
    - Allow generation to persist even when user navigates away
    - Enable polling for completion status
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'astra_visualizations' AND column_name = 'status'
  ) THEN
    ALTER TABLE astra_visualizations 
    ADD COLUMN status text DEFAULT 'complete' CHECK (status IN ('pending', 'generating', 'complete', 'error'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'astra_visualizations' AND column_name = 'error_message'
  ) THEN
    ALTER TABLE astra_visualizations ADD COLUMN error_message text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_astra_visualizations_status 
ON astra_visualizations(team_id, status) 
WHERE status IN ('pending', 'generating');
