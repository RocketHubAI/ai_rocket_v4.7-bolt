/*
  # Add Local Upload Support to Document Chunks

  1. Schema Changes
    - Add `upload_source` column to track whether document came from Google Drive or local upload
    - Add `storage_path` column to store Supabase Storage path for local uploads
    - Add `uploaded_by` column to track which user uploaded the file
    - Add `original_filename` column to preserve the original filename

  2. Updates
    - Set default upload_source to 'google_drive' for backward compatibility
    - All existing documents are from Google Drive

  3. Security
    - No RLS changes needed - existing policies cover both sources
    - Team-based isolation is maintained

  4. Notes
    - For Google Drive files: upload_source = 'google_drive', storage_path = NULL
    - For local uploads: upload_source = 'local_upload', storage_path = bucket path
    - google_file_id will be NULL for local uploads
*/

-- Add upload_source column
ALTER TABLE document_chunks
ADD COLUMN IF NOT EXISTS upload_source TEXT DEFAULT 'google_drive' 
CHECK (upload_source IN ('google_drive', 'local_upload'));

-- Add storage_path for Supabase Storage files
ALTER TABLE document_chunks
ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- Add uploaded_by to track which user uploaded the file
ALTER TABLE document_chunks
ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES auth.users(id);

-- Add original_filename to preserve the original name (separate from file_name which may be normalized)
ALTER TABLE document_chunks
ADD COLUMN IF NOT EXISTS original_filename TEXT;

-- Add index for efficient querying by upload source
CREATE INDEX IF NOT EXISTS idx_document_chunks_upload_source ON document_chunks(upload_source);

-- Add index for efficient querying by uploader
CREATE INDEX IF NOT EXISTS idx_document_chunks_uploaded_by ON document_chunks(uploaded_by);

-- Add index for efficient querying by storage_path
CREATE INDEX IF NOT EXISTS idx_document_chunks_storage_path ON document_chunks(storage_path) WHERE storage_path IS NOT NULL;

-- Update existing document chunks to have upload_source set
UPDATE document_chunks
SET upload_source = 'google_drive'
WHERE upload_source IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN document_chunks.upload_source IS 'Source of the document: google_drive or local_upload';
COMMENT ON COLUMN document_chunks.storage_path IS 'Path in Supabase Storage bucket for local uploads (NULL for Google Drive files)';
COMMENT ON COLUMN document_chunks.uploaded_by IS 'User who uploaded the file (for local uploads)';
COMMENT ON COLUMN document_chunks.original_filename IS 'Original filename as provided by user';
