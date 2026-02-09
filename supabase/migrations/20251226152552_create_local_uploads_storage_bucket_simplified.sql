/*
  # Create Local Uploads Storage Bucket

  1. New Storage Bucket
    - `local-uploads` - Stores files uploaded directly by users
    - Private bucket with authentication required
    - Organized by team_id/user_id/upload_id structure
    - File size limit: 50 MB
    - Allowed MIME types: PDF, DOCX, TXT, MD, CSV

  2. Security
    - RLS policies enforce team-based isolation
    - Users can only upload to their team's folder
    - Users can only access files from their team
    - Admins have full access to their team's files

  3. Notes
    - Bucket structure: {team_id}/{user_id}/{upload_id}/{filename}
    - Files are private by default
    - Storage is encrypted at rest (Supabase default)
    - RLS policies will be configured via edge function and Supabase Storage API
*/

-- Create the local-uploads storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'local-uploads',
  'local-uploads',
  false,
  52428800, -- 50 MB in bytes
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/plain',
    'text/markdown',
    'text/csv'
  ]
)
ON CONFLICT (id) DO NOTHING;
