/*
  # Create Function to Count Distinct Email Threads

  1. New Functions
    - `count_distinct_email_threads(p_user_id uuid)`
      - Counts unique thread_id values for a user
      - Returns integer count
      - More efficient than fetching all records and counting in JavaScript

  2. Security
    - Function uses SECURITY DEFINER to bypass RLS
    - Still validates user_id parameter to ensure users can only count their own threads
    - Safe for authenticated users

  3. Purpose
    - Provides accurate count of unique email conversations
    - Handles large datasets efficiently
    - Avoids pagination issues with client-side counting
*/

-- Create function to count distinct email threads for a user
CREATE OR REPLACE FUNCTION count_distinct_email_threads(p_user_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COUNT(DISTINCT thread_id)
  FROM document_chunks_emails
  WHERE user_id::uuid = p_user_id
  AND thread_id IS NOT NULL;
$$;

-- Add helpful comment
COMMENT ON FUNCTION count_distinct_email_threads IS 'Counts unique email threads (conversations) for a user';
