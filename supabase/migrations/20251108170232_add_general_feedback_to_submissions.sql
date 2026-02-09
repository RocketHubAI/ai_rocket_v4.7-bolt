/*
  # Add General Feedback Field to Submissions

  ## Overview
  Adds a text field to capture open-ended general feedback at the end of each submission.
  This allows users to share their most important suggestion, issue, or feature request.

  ## Changes
  1. Add `general_feedback` column to `user_feedback_submissions` table
     - Type: text (nullable, optional field)
     - Description: Open-ended feedback, suggestions, or feature requests

  ## Notes
  - This is an optional field that appears after the 3 rated questions
  - Helps prioritize what matters most to users
*/

-- Add general_feedback column to user_feedback_submissions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_feedback_submissions' AND column_name = 'general_feedback'
  ) THEN
    ALTER TABLE user_feedback_submissions ADD COLUMN general_feedback text;
  END IF;
END $$;
