/*
  # Enable Realtime for Document Chunks Emails Table

  1. Changes
    - Enable Realtime replication for document_chunks_emails table
    - This allows real-time subscriptions to update the UI as emails are synced

  2. Purpose
    - Users can see their email count update in real-time during sync
    - Improves UX by showing live progress
*/

-- Enable Realtime for document_chunks_emails table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'document_chunks_emails'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE document_chunks_emails;
  END IF;
END $$;
