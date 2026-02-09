/*
  # Update Local Uploads Bucket Allowed MIME Types

  1. Changes
    - Add Excel file types (XLS, XLSX)
    - Add PowerPoint file types (PPT, PPTX)
    - Match the supported file types from Google Drive integration

  2. New Allowed Types
    - PDF
    - Word (DOC, DOCX)
    - Excel (XLS, XLSX) - NEW
    - PowerPoint (PPT, PPTX) - NEW
    - TXT
    - Markdown (MD)
    - CSV
*/

-- Update the local-uploads bucket to include Excel and PowerPoint file types
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint',
  'text/plain',
  'text/markdown',
  'text/csv'
]
WHERE id = 'local-uploads';
