/*
  # Add Support Request Fields to Feedback System

  ## Overview
  Extends the existing feedback system to handle support requests (bug reports, support messages, feature requests).

  ## Changes
  1. Add `support_type` column to categorize submissions
     - Values: 'bug_report', 'support_message', 'feature_request', or null (for regular feedback)
  
  2. Add `support_details` JSONB column to store structured support information
     - Fields: subject (string), description (string), url_context (optional), browser_info (optional)

  ## Notes
  - Existing feedback submissions will have null support_type (regular feedback)
  - Support requests will have a support_type and structured details in JSONB
  - This allows unified storage while maintaining flexibility for different submission types
*/

-- Add support_type column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_feedback_submissions' AND column_name = 'support_type'
  ) THEN
    ALTER TABLE user_feedback_submissions ADD COLUMN support_type text CHECK (support_type IN ('bug_report', 'support_message', 'feature_request'));
  END IF;
END $$;

-- Add support_details JSONB column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_feedback_submissions' AND column_name = 'support_details'
  ) THEN
    ALTER TABLE user_feedback_submissions ADD COLUMN support_details jsonb;
  END IF;
END $$;

-- Create index for support_type queries
CREATE INDEX IF NOT EXISTS idx_feedback_submissions_support_type ON user_feedback_submissions(support_type) WHERE support_type IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN user_feedback_submissions.support_type IS 'Type of support request: bug_report, support_message, feature_request, or null for regular feedback';
COMMENT ON COLUMN user_feedback_submissions.support_details IS 'Structured support data: {subject, description, url_context, browser_info}';