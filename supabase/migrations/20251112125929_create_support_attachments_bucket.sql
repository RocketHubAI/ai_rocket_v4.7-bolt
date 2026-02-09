/*
  # Create support attachments storage bucket

  1. New Storage Bucket
    - `support-attachments` bucket for storing bug report and support request files
    - Public bucket for easy access in support emails
    - 10MB file size limit per file
    - Accepts images and PDFs

  2. Security
    - Authenticated users can upload to their own folder
    - Authenticated users can read all support attachments
    - Files organized by user_id folders
*/

-- Create the support-attachments bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'support-attachments',
  'support-attachments',
  true,
  10485760, -- 10MB limit
  ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload support attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can view support attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own support attachments" ON storage.objects;

-- Allow authenticated users to upload files to their own folder
CREATE POLICY "Users can upload support attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'support-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to read all support attachments
CREATE POLICY "Users can view support attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'support-attachments');

-- Allow users to delete their own support attachments
CREATE POLICY "Users can delete own support attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'support-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
