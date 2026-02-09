/*
  # Add attachments support to feedback submissions
  
  1. Changes
    - Add `attachment_urls` column to store uploaded file URLs
    - Type: text[] (array of strings)
    - Allows users to attach screenshots/files to bug reports, support messages, and feature requests
    
  2. Purpose
    - Enable users to provide visual context for bugs and feature requests
    - Store public URLs to files in Supabase Storage
*/

-- Add attachment_urls column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_feedback_submissions' AND column_name = 'attachment_urls'
  ) THEN
    ALTER TABLE user_feedback_submissions ADD COLUMN attachment_urls text[] DEFAULT '{}';
  END IF;
END $$;

COMMENT ON COLUMN user_feedback_submissions.attachment_urls IS 'Array of public URLs to uploaded attachment files (screenshots, documents, etc.)';
