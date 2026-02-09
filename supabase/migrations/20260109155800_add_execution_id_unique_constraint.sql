/*
  # Add unique constraint on execution_id for workflow_executions

  1. Changes
    - Add unique constraint on execution_id column to support upsert operations
    - This enables syncing n8n execution data without duplicates
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'workflow_executions_execution_id_key'
  ) THEN
    ALTER TABLE workflow_executions 
    ADD CONSTRAINT workflow_executions_execution_id_key UNIQUE (execution_id);
  END IF;
END $$;
