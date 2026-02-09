/*
  # Simplify Support Status and Add Not Resolved Flag

  1. Changes to support status
    - Change status enum to only 'needs_response' and 'responded'
    - Update existing statuses to map to new values
    - Add `not_resolved` boolean flag

  2. Updates
    - All 'new' and 'in_progress' → 'needs_response'
    - All 'responded' and 'resolved' → 'responded'
    - Add not_resolved column (defaults to false)
*/

-- Drop the old enum constraint and convert to text first
DO $$
BEGIN
  -- Drop default
  ALTER TABLE user_feedback_submissions
    ALTER COLUMN status DROP DEFAULT;

  -- Convert column to text
  ALTER TABLE user_feedback_submissions
    ALTER COLUMN status TYPE text;

  -- Update existing values to new status system
  UPDATE user_feedback_submissions
  SET status =
    CASE
      WHEN status IN ('new', 'in_progress') THEN 'needs_response'
      WHEN status IN ('responded', 'resolved') THEN 'responded'
      ELSE 'needs_response'
    END;

  -- Drop old enum if exists
  DROP TYPE IF EXISTS support_status CASCADE;

  -- Create new enum
  CREATE TYPE support_status AS ENUM ('needs_response', 'responded');

  -- Change column back to enum type
  ALTER TABLE user_feedback_submissions
    ALTER COLUMN status TYPE support_status USING status::support_status;

  -- Set default
  ALTER TABLE user_feedback_submissions
    ALTER COLUMN status SET DEFAULT 'needs_response'::support_status;
END $$;

-- Add not_resolved flag
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_feedback_submissions' AND column_name = 'not_resolved'
  ) THEN
    ALTER TABLE user_feedback_submissions
    ADD COLUMN not_resolved boolean DEFAULT false NOT NULL;
  END IF;
END $$;

-- Create index for filtering by not_resolved
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_not_resolved
  ON user_feedback_submissions(not_resolved)
  WHERE not_resolved = true;

-- Update all existing messages with support_type to have needs_response status
UPDATE user_feedback_submissions
SET status = 'needs_response'
WHERE support_type IS NOT NULL
AND status IS NULL;
